import pg from "pg";

const { Client } = pg;
const migrationId = "supabase_to_neon_public_v1";
const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;

if (!sourceUrl) {
  console.log("[data-migration] SOURCE_DATABASE_URL is not configured; nothing to import.");
  process.exit(0);
}
if (!targetUrl) throw new Error("DATABASE_URL is required for the data import.");
if (sourceUrl === targetUrl) {
  throw new Error("SOURCE_DATABASE_URL and DATABASE_URL must point to different databases.");
}

const tableOrder = [
  "empresas", "marcas", "categorias", "tipos_movimiento", "almacenes",
  "usuarios", "equipos_compatibles", "productos", "ubicaciones", "clientes",
  "stock", "producto_equipo", "movimientos", "ventas", "venta_detalle",
  "licencias", "pagos",
];

const selfReferences = new Map([
  ["categorias", "categoriaPadre"],
  ["usuarios", "creadoPor"],
]);

const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;
const qualifiedTable = (table) => `public.${quoteIdentifier(table)}`;

async function getColumns(client, table) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table],
  );
  return rows.map((row) => row.column_name);
}

async function getPrimaryKey(client, table) {
  const { rows } = await client.query(
    `SELECT a.attname AS column_name
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
      ORDER BY array_position(i.indkey, a.attnum)`,
    [`public.${table}`],
  );
  return rows.map((row) => row.column_name);
}

async function upsertRows(target, table, columns, primaryKey, rows) {
  if (!rows.length) return;

  const quotedColumns = columns.map(quoteIdentifier).join(", ");
  const conflictColumns = primaryKey.map(quoteIdentifier).join(", ");
  const updateColumns = columns.filter((column) => !primaryKey.includes(column));
  const conflictAction = updateColumns.length
    ? `DO UPDATE SET ${updateColumns.map((column) =>
        `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`).join(", ")}`
    : "DO NOTHING";

  for (let start = 0; start < rows.length; start += 100) {
    const batch = rows.slice(start, start + 100);
    const values = [];
    const tuples = batch.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(row[column]);
        return `$${values.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });
    await target.query(
      `INSERT INTO ${qualifiedTable(table)} (${quotedColumns}) VALUES ${tuples.join(", ")}
       ON CONFLICT (${conflictColumns}) ${conflictAction}`,
      values,
    );
  }
}

async function syncSequence(target, table, columns) {
  if (!columns.includes("id")) return;
  const sequenceResult = await target.query(
    "SELECT pg_get_serial_sequence($1, $2) AS sequence_name",
    [`public.${table}`, "id"],
  );
  const sequenceName = sequenceResult.rows[0]?.sequence_name;
  if (!sequenceName) return;
  const maxResult = await target.query(
    `SELECT MAX(${quoteIdentifier("id")}) AS max_id FROM ${qualifiedTable(table)}`,
  );
  const maxId = maxResult.rows[0]?.max_id;
  if (maxId !== null && maxId !== undefined) {
    await target.query("SELECT setval($1::regclass, $2, true)", [sequenceName, maxId]);
  }
}

const source = new Client({ connectionString: sourceUrl });
const target = new Client({ connectionString: targetUrl });

try {
  await Promise.all([source.connect(), target.connect()]);
  await target.query(`
    CREATE TABLE IF NOT EXISTS public._data_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      details JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `);

  const existing = await target.query(
    "SELECT 1 FROM public._data_migrations WHERE id = $1", [migrationId],
  );
  if (existing.rowCount) {
    console.log(`[data-migration] ${migrationId} was already applied.`);
  } else {
    await target.query("BEGIN");
    const totals = {};
    const deferredUpdates = [];

    for (const table of tableOrder) {
      const [sourceColumns, targetColumns] = await Promise.all([
        getColumns(source, table), getColumns(target, table),
      ]);
      if (!sourceColumns.length || !targetColumns.length) continue;

      const columns = targetColumns.filter((column) => sourceColumns.includes(column));
      const primaryKey = await getPrimaryKey(target, table);
      if (!primaryKey.length || !primaryKey.every((column) => columns.includes(column))) {
        throw new Error(`Cannot determine a compatible primary key for ${table}.`);
      }

      const { rows } = await source.query(
        `SELECT ${columns.map(quoteIdentifier).join(", ")} FROM ${qualifiedTable(table)}`,
      );
      const selfReference = selfReferences.get(table);
      if (selfReference && columns.includes(selfReference)) {
        for (const row of rows) {
          if (row[selfReference] !== null) {
            deferredUpdates.push({
              table, primaryKey,
              keyValues: primaryKey.map((column) => row[column]),
              column: selfReference, value: row[selfReference],
            });
            row[selfReference] = null;
          }
        }
      }

      await upsertRows(target, table, columns, primaryKey, rows);
      await syncSequence(target, table, targetColumns);
      totals[table] = rows.length;
      console.log(`[data-migration] ${table}: ${rows.length} rows copied.`);
    }

    for (const update of deferredUpdates) {
      const where = update.primaryKey.map((column, index) =>
        `${quoteIdentifier(column)} = $${index + 2}`).join(" AND ");
      await target.query(
        `UPDATE ${qualifiedTable(update.table)} SET ${quoteIdentifier(update.column)} = $1 WHERE ${where}`,
        [update.value, ...update.keyValues],
      );
    }

    await target.query(
      "INSERT INTO public._data_migrations (id, details) VALUES ($1, $2::jsonb)",
      [migrationId, JSON.stringify({ source: "Supabase", totals })],
    );
    await target.query("COMMIT");
    console.log(`[data-migration] ${migrationId} completed successfully.`);
  }
} catch (error) {
  try { await target.query("ROLLBACK"); } catch {}
  console.error("[data-migration] Import failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await Promise.allSettled([source.end(), target.end()]);
}
