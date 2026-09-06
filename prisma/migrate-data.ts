/**
 * One-time SQLite -> PostgreSQL data migration.
 * Usage: MIGRATION_DATABASE_URL="postgresql://..." bun prisma/migrate-data.ts
 */
import { Database } from 'bun:sqlite'
import { Client } from 'pg'

const connectionString = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL
if (!connectionString?.startsWith('postgres')) {
  throw new Error('Define MIGRATION_DATABASE_URL con la conexión PostgreSQL de Supabase')
}

const sqlite = new Database('./db/custom.db', { readonly: true })
const postgres = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
type Row = Record<string, unknown>

const date = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return value
  return new Date(typeof value === 'number' ? value : String(value))
}
const bool = (value: unknown) => value === true || value === 1 || value === '1'

async function insertRows(table: string, columns: string[], sourceRows: Row[]) {
  for (const row of sourceRows) {
    const values = columns.map((column) => row[column] ?? null)
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ')
    const quotedColumns = columns.map((column) => `"${column}"`).join(', ')
    await postgres.query(
      `INSERT INTO "${table}" (${quotedColumns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
      values,
    )
  }
  console.log(`  ${table}: ${sourceRows.length}`)
}

function rows(table: string): Row[] {
  return sqlite.query(`SELECT * FROM "${table}"`).all() as Row[]
}

async function resetSequence(table: string) {
  await postgres.query(`
    SELECT setval(
      pg_get_serial_sequence('"${table}"', 'id'),
      COALESCE((SELECT MAX(id) FROM "${table}"), 1),
      EXISTS (SELECT 1 FROM "${table}")
    )
  `)
}

async function main() {
  await postgres.connect()
  await postgres.query('BEGIN')

  try {
    const sourceCompanies = rows('empresas')
    await insertRows('empresas', ['id', 'nombre', 'nit', 'direccion', 'telefono', 'email', 'logo', 'activa', 'plan', 'fechaCreacion'],
      sourceCompanies.map((row) => ({ ...row, activa: bool(row.activa), fechaCreacion: date(row.fechaCreacion) })))

    let companyId: number
    if (sourceCompanies.length === 0) {
      const result = await postgres.query<{ id: number }>(`
        INSERT INTO empresas (nombre, activa, plan)
        VALUES ('Empresa Principal', true, 'mensual') RETURNING id
      `)
      companyId = result.rows[0].id
    } else companyId = Number(sourceCompanies[0].id)

    const sourceWarehouses = rows('almacenes')
    await insertRows('almacenes', ['id', 'nombre', 'direccion', 'telefono', 'encargado', 'activo', 'empresaId'],
      sourceWarehouses.map((row) => ({ ...row, activo: bool(row.activo), empresaId: row.empresaId ?? companyId })))

    let warehouseId: number
    if (sourceWarehouses.length === 0) {
      const result = await postgres.query<{ id: number }>(`
        INSERT INTO almacenes (nombre, activo, "empresaId")
        VALUES ('Almacén Principal', true, $1) RETURNING id
      `, [companyId])
      warehouseId = result.rows[0].id
    } else warehouseId = Number(sourceWarehouses[0].id)

    await insertRows('marcas', ['id', 'nombre'], rows('marcas'))
    await insertRows('categorias', ['id', 'nombre', 'categoriaPadre'], rows('categorias'))
    await insertRows('equipos_compatibles', ['id', 'idMarca', 'modelo', 'tipoEquipo'], rows('equipos_compatibles'))
    await insertRows('tipos_movimiento', ['id', 'nombre'], rows('tipos_movimiento'))
    await insertRows('ubicaciones', ['id', 'pasillo', 'estante', 'nivel', 'activo', 'almacenId'],
      rows('ubicaciones').map((row) => ({ ...row, activo: bool(row.activo), almacenId: row.almacenId ?? warehouseId })))
    await insertRows('productos', ['id', 'sku', 'nombre', 'descripcion', 'idCategoria', 'idMarca', 'codigoBarras', 'unidadMedida', 'costoUnitario', 'precioVenta', 'stockMinimo', 'stockMaximo', 'fotoUrl', 'activo', 'fechaCreacion'],
      rows('productos').map((row) => ({ ...row, activo: bool(row.activo), fechaCreacion: date(row.fechaCreacion) })))
    await insertRows('producto_equipo', ['idProducto', 'idEquipo'], rows('producto_equipo'))
    await insertRows('stock', ['idProducto', 'idUbicacion', 'cantidad'], rows('stock'))
    await insertRows('clientes', ['id', 'nombre', 'telefono', 'email', 'tipoCliente', 'fechaRegistro'],
      rows('clientes').map((row) => ({ ...row, fechaRegistro: date(row.fechaRegistro) })))

    const sourceUsers = rows('usuarios')
    await insertRows('usuarios', ['id', 'nombre', 'email', 'password', 'rol', 'activo', 'ultimoAcceso', 'fechaCreacion', 'creadoPor', 'empresaId', 'almacenId'],
      sourceUsers.map((row) => ({
        ...row, activo: bool(row.activo), ultimoAcceso: date(row.ultimoAcceso),
        fechaCreacion: date(row.fechaCreacion), creadoPor: null,
        empresaId: row.empresaId ?? companyId, almacenId: row.almacenId ?? warehouseId,
      })))
    for (const user of sourceUsers) {
      if (user.creadoPor) {
        await postgres.query('UPDATE usuarios SET "creadoPor" = $1 WHERE id = $2', [user.creadoPor, user.id])
      }
    }

    await insertRows('movimientos', ['id', 'idProducto', 'idUbicacion', 'idTipo', 'cantidad', 'costoUnitario', 'referencia', 'usuario', 'observacion', 'fecha', 'almacenId'],
      rows('movimientos').map((row) => ({ ...row, fecha: date(row.fecha), almacenId: row.almacenId ?? warehouseId })))
    await insertRows('ventas', ['id', 'idCliente', 'folio', 'fecha', 'subtotal', 'total', 'estado', 'almacenId'],
      rows('ventas').map((row) => ({ ...row, fecha: date(row.fecha), almacenId: row.almacenId ?? warehouseId })))
    await insertRows('venta_detalle', ['idVenta', 'idProducto', 'cantidad', 'precioUnitario'], rows('venta_detalle'))
    await insertRows('licencias', ['id', 'clave', 'tipo', 'estado', 'fechaActivacion', 'fechaVencimiento', 'maxUsuarios', 'diasPrueba', 'datosEmpresa', 'notas', 'fechaCreacion', 'empresaId'],
      rows('licencias').map((row) => ({
        ...row, fechaActivacion: date(row.fechaActivacion), fechaVencimiento: date(row.fechaVencimiento),
        fechaCreacion: date(row.fechaCreacion), empresaId: row.empresaId ?? companyId,
      })))

    for (const table of ['empresas', 'almacenes', 'marcas', 'categorias', 'equipos_compatibles', 'tipos_movimiento', 'ubicaciones', 'productos', 'clientes', 'usuarios', 'movimientos', 'ventas', 'licencias']) {
      await resetSequence(table)
    }

    await postgres.query('COMMIT')
    console.log('Migración completada correctamente.')
  } catch (error) {
    await postgres.query('ROLLBACK')
    throw error
  } finally {
    sqlite.close()
    await postgres.end()
  }
}

main().catch((error) => {
  console.error('Error de migración:', error instanceof Error ? error.message : error)
  process.exit(1)
})
