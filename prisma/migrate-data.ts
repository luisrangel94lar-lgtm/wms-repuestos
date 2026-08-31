/**
 * Fast migration script: SQLite → Supabase PostgreSQL
 * Uses raw SQL batch inserts via pg (much faster than Prisma one-by-one)
 */
import Database from 'better-sqlite3'
import { Client } from 'pg'
import fs from 'fs'

// Load .env manually
const envContent = fs.readFileSync('.env', 'utf8')
const envVars: Record<string, string> = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)="(.*)"$/)
  if (match) envVars[match[1]] = match[2]
}

const CONNECTION_STRING = envVars.DATABASE_URL!
const SQLITE_PATH = './db/custom.db'

function esc(val: any): any {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'string') {
    return "$$" + val.replace(/\$/g, '$$') + "$$"
  }
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  if (typeof val === 'number') {
    // Could be a Unix timestamp (milliseconds) from SQLite
    if (val > 1e12) {
      return "'" + new Date(val).toISOString().replace('T', ' ').substring(0, 19) + "'"
    }
    return String(val)
  }
  if (val instanceof Date) return "'" + val.toISOString().replace('T', ' ').substring(0, 19) + "'"
  return String(val)
}

async function migrate() {
  console.log('🔄 Iniciando migración rápida SQLite → PostgreSQL...\n')

  const sqlite = new Database(SQLITE_PATH, { readonly: true })
  console.log('📂 SQLite abierto:', SQLITE_PATH)

  const pg = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  })
  await pg.connect()
  console.log('🐘 PostgreSQL conectado via Pooler\n')

  try {
    // Helper: batch insert
    async function batchInsert(table: string, columns: string[], rows: any[]) {
      if (rows.length === 0) return
      const cols = columns.map(c => `"${c}"`).join(', ')
      const batchSize = 50
      
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize)
        const values = batch.map(row => {
          return '(' + columns.map(col => esc(row[col] === undefined ? null : row[col])).join(', ') + ')'
        }).join(', ')
        
        const sql = `INSERT INTO "${table}" (${cols}) VALUES ${values} ON CONFLICT DO NOTHING`
        await pg.query(sql)
      }
      console.log(`   ✅ ${table}: ${rows.length} registros insertados`)
    }

    // 1. Marcas
    console.log('📦 Marcas:')
    await batchInsert('marcas', ['id', 'nombre'], sqlite.prepare('SELECT id, nombre FROM marcas').all())

    // 2. Categorías
    console.log('📁 Categorías:')
    const cats = sqlite.prepare('SELECT * FROM categorias ORDER BY categoriaPadre NULLS FIRST').all()
    await batchInsert('categorias', ['id', 'nombre', 'categoriaPadre'], cats)

    // 3. Equipos
    console.log('🔧 Equipos:')
    await batchInsert('equipos_compatibles', ['id', 'idMarca', 'modelo', 'tipoEquipo'], sqlite.prepare('SELECT * FROM equipos_compatibles').all())

    // 4. Tipos de Movimiento
    console.log('📋 Tipos de Movimiento:')
    await batchInsert('tipos_movimiento', ['id', 'nombre'], sqlite.prepare('SELECT * FROM tipos_movimiento').all())

    // 5. Ubicaciones
    console.log('📍 Ubicaciones:')
    const ubis = sqlite.prepare('SELECT * FROM ubicaciones').all()
    await batchInsert('ubicaciones', ['id', 'pasillo', 'estante', 'nivel', 'activo'], ubis.map((u: any) => ({...u, activo: Boolean(u.activo)})))

    // 6. Productos
    console.log('📦 Productos:')
    const prods = sqlite.prepare('SELECT * FROM productos').all()
    await batchInsert('productos', 
      ['id', 'sku', 'nombre', 'descripcion', 'idCategoria', 'idMarca', 'codigoBarras', 
       'unidadMedida', 'costoUnitario', 'precioVenta', 'stockMinimo', 'stockMaximo', 
       'fotoUrl', 'activo', 'fechaCreacion'], 
      prods.map((p: any) => ({...p, costoUnitario: Number(p.costoUnitario), precioVenta: Number(p.precioVenta), activo: Boolean(p.activo)})))

    // 7. Producto-Equipo
    console.log('🔗 Producto-Equipo:')
    await batchInsert('producto_equipo', ['idProducto', 'idEquipo'], sqlite.prepare('SELECT * FROM producto_equipo').all())

    // 8. Stock
    console.log('📊 Stock:')
    await batchInsert('stock', ['idProducto', 'idUbicacion', 'cantidad'], sqlite.prepare('SELECT * FROM stock').all())

    // 9. Movimientos
    console.log('🔄 Movimientos:')
    const movs = sqlite.prepare('SELECT * FROM movimientos').all()
    await batchInsert('movimientos', 
      ['id', 'idProducto', 'idUbicacion', 'idTipo', 'cantidad', 'costoUnitario', 'referencia', 'usuario', 'observacion', 'fecha'],
      movs.map((m: any) => ({...m, costoUnitario: m.costoUnitario ? Number(m.costoUnitario) : null})))

    // 10. Clientes
    console.log('👤 Clientes:')
    await batchInsert('clientes', ['id', 'nombre', 'telefono', 'email', 'tipoCliente', 'fechaRegistro'], 
      sqlite.prepare('SELECT * FROM clientes').all().map((c: any) => ({...c, tipoCliente: c.tipoCliente || 'Tecnico'})))

    // 11. Ventas
    console.log('🛒 Ventas:')
    await batchInsert('ventas', ['id', 'idCliente', 'folio', 'fecha', 'subtotal', 'total', 'estado'],
      sqlite.prepare('SELECT * FROM ventas').all().map((v: any) => ({...v, subtotal: v.subtotal ? Number(v.subtotal) : null, total: v.total ? Number(v.total) : null, estado: v.estado || 'COMPLETADA'})))

    // 12. Venta Detalle
    console.log('📝 Venta Detalle:')
    await batchInsert('venta_detalle', ['idVenta', 'idProducto', 'cantidad', 'precioUnitario'],
      sqlite.prepare('SELECT * FROM venta_detalle').all().map((d: any) => ({...d, precioUnitario: Number(d.precioUnitario)})))

    // 13. Usuarios
    console.log('🔐 Usuarios:')
    await batchInsert('usuarios', ['id', 'nombre', 'email', 'password', 'rol', 'activo', 'ultimoAcceso', 'fechaCreacion', 'creadoPor'],
      sqlite.prepare('SELECT * FROM usuarios').all().map((u: any) => ({...u, rol: u.rol || 'tecnico', activo: Boolean(u.activo)})))

    // 14. Licencias
    console.log('🔑 Licencias:')
    await batchInsert('licencias', ['id', 'clave', 'tipo', 'estado', 'fechaActivacion', 'fechaVencimiento', 'maxUsuarios', 'diasPrueba', 'datosEmpresa', 'notas', 'fechaCreacion'],
      sqlite.prepare('SELECT * FROM licencias').all().map((l: any) => ({...l, tipo: l.tipo || 'trial', estado: l.estado || 'activa', maxUsuarios: l.maxUsuarios || 3, diasPrueba: l.diasPrueba || 30})))

    // Verify counts
    console.log('\n📊 Verificación en PostgreSQL:')
    const verifyTables = ['marcas', 'categorias', 'equipos_compatibles', 'productos', 'ubicaciones', 'stock', 'movimientos', 'clientes', 'ventas', 'venta_detalle', 'usuarios', 'licencias']
    for (const table of verifyTables) {
      const result = await pg.query(`SELECT COUNT(*) as c FROM "${table}"`)
      console.log(`   ${table}: ${result.rows[0].c}`)
    }

    // Reset sequences
    console.log('\n🔄 Reseteando secuencias...')
    const seqTables = ['marcas', 'categorias', 'equipos_compatibles', 'productos', 'ubicaciones', 'tipos_movimiento', 'movimientos', 'clientes', 'ventas', 'usuarios', 'licencias']
    for (const table of seqTables) {
      const result = await pg.query(`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM "${table}"`)
      const nextId = result.rows[0].next_id
      await pg.query(`ALTER SEQUENCE "${table}_id_seq" RESTART WITH ${nextId}`)
    }
    console.log('   ✅ Secuencias reseteadas')

    console.log('\n✅ ¡Migración completada exitosamente!')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    sqlite.close()
    await pg.end()
  }
}

migrate()
