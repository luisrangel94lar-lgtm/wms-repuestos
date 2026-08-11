import { db } from '../src/lib/db'
import { Prisma } from '@prisma/client'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const daysAgo = (days: number, hour?: number): Date => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour ?? (8 + Math.floor(Math.random() * 10)), Math.floor(Math.random() * 60), 0, 0)
  return d
}

/** Distribute `total` units across `locationCount` random locations. */
function distributeStock(total: number, locationCount: number): number[] {
  if (total === 0) return new Array(locationCount).fill(0)
  const buckets = new Array(locationCount).fill(0)
  let remaining = total
  for (let i = 0; i < locationCount && remaining > 0; i++) {
    // Last bucket gets remainder; otherwise random portion
    const isLast = i === locationCount - 1
    if (isLast) {
      buckets[i] = remaining
    } else {
      const portion = Math.min(remaining, Math.floor(Math.random() * (remaining / (locationCount - i)) * 2) + 1)
      buckets[i] = portion
      remaining -= portion
    }
  }
  // Shuffle so the "big" bucket isn't always the last location
  return buckets.sort(() => Math.random() - 0.5)
}

// ---------------------------------------------------------------------------
// 1. Clear all tables (reverse FK order)
// ---------------------------------------------------------------------------

async function clearAll() {
  console.log('🗑️  Clearing existing data…')

  const tx = [
    db.ventaDetalle.deleteMany(),
    db.venta.deleteMany(),
    db.movimiento.deleteMany(),
    db.stock.deleteMany(),
    db.productoEquipo.deleteMany(),
    db.producto.deleteMany(),
    db.equipo.deleteMany(),
    db.ubicacion.deleteMany(),
    db.tipoMovimiento.deleteMany(),
    db.cliente.deleteMany(),
    db.marca.deleteMany(),
    db.categoria.deleteMany(),
  ]
  await Promise.all(tx)

  console.log('✅  All tables cleared.')
}

// ---------------------------------------------------------------------------
// 2. Brands (Marcas)
// ---------------------------------------------------------------------------

async function seedMarcas() {
  const data: Prisma.MarcaCreateInput[] = [
    { nombre: 'Whirlpool' },
    { nombre: 'Samsung' },
    { nombre: 'LG' },
    { nombre: 'Mabe' },
    { nombre: 'Carrier' },
    { nombre: 'Trane' },
    { nombre: 'Daikin' },
    { nombre: 'York' },
    { nombre: 'Lennox' },
    { nombre: 'Rheem' },
    { nombre: 'Emerson' },
    { nombre: 'Tecumseh' },
    { nombre: 'Copeland' },
    { nombre: 'Danfoss' },
    { nombre: 'Refco' },
  ]

  const marcas = await Promise.all(data.map((d) => db.marca.create({ data: d })))
  console.log(`✅  ${marcas.length} marcas creadas.`)
  return marcas
}

// ---------------------------------------------------------------------------
// 3. Categories (Categorías)
// ---------------------------------------------------------------------------

async function seedCategorias() {
  const data: Prisma.CategoriaCreateInput[] = [
    { nombre: 'Compresores' },
    { nombre: 'Condensadores' },
    { nombre: 'Evaporadores' },
    { nombre: 'Termostatos' },
    { nombre: 'Válvulas' },
    { nombre: 'Tubos y Conexiones' },
    { nombre: 'Filtros' },
    { nombre: 'Motores' },
    { nombre: 'Resistencias' },
    { nombre: 'Gas Refrigerante' },
    { nombre: 'Repuestos Eléctricos' },
    { nombre: 'Sellos y Juntas' },
  ]

  const cats = await Promise.all(data.map((d) => db.categoria.create({ data: d })))
  console.log(`✅  ${cats.length} categorías creadas.`)
  return cats
}

// ---------------------------------------------------------------------------
// 4. Equipment models (Equipos compatibles) – 37 models across 15 brands
// ---------------------------------------------------------------------------

async function seedEquipos(marcas: Awaited<ReturnType<typeof seedMarcas>>) {
  const brandIdx: Record<string, number> = {}
  marcas.forEach((m, i) => { brandIdx[m.nombre] = i })

  type EqRow = { modelo: string; tipoEquipo: string; marcaNombre: string }
  const data: EqRow[] = [
    // Whirlpool
    { modelo: 'WRT518', tipoEquipo: 'Nevera', marcaNombre: 'Whirlpool' },
    { modelo: 'WRX735SDB', tipoEquipo: 'Nevera Side-by-Side', marcaNombre: 'Whirlpool' },
    { modelo: 'WZC312', tipoEquipo: 'Congelador Horizontal', marcaNombre: 'Whirlpool' },
    // Samsung
    { modelo: 'RF28R6201SR', tipoEquipo: 'Nevera Side-by-Side', marcaNombre: 'Samsung' },
    { modelo: 'RF22N9781SG', tipoEquipo: 'Nevera French Door', marcaNombre: 'Samsung' },
    { modelo: 'AR18NQPA', tipoEquipo: 'Mini Split', marcaNombre: 'Samsung' },
    // LG
    { modelo: 'LFX28968ST', tipoEquipo: 'Nevera French Door', marcaNombre: 'LG' },
    { modelo: 'LT24220', tipoEquipo: 'Nevera Top Mount', marcaNombre: 'LG' },
    { modelo: 'LS120HSV5', tipoEquipo: 'Mini Split', marcaNombre: 'LG' },
    // Mabe
    { modelo: 'MPR100H', tipoEquipo: 'Nevera', marcaNombre: 'Mabe' },
    { modelo: 'CMA12B', tipoEquipo: 'Congelador Vertical', marcaNombre: 'Mabe' },
    // Carrier
    { modelo: '24ACC624A003', tipoEquipo: 'Mini Split', marcaNombre: 'Carrier' },
    { modelo: '38AU024', tipoEquipo: 'Condensador Paquete', marcaNombre: 'Carrier' },
    { modelo: '30XA-252', tipoEquipo: 'Chiller Centrífugo', marcaNombre: 'Carrier' },
    { modelo: '50XC-N', tipoEquipo: 'Aire Central Rooftop', marcaNombre: 'Carrier' },
    // Trane
    { modelo: 'XV20i-5TON', tipoEquipo: 'Split Inverter', marcaNombre: 'Trane' },
    { modelo: 'XR14-3TON', tipoEquipo: 'Split', marcaNombre: 'Trane' },
    { modelo: 'TWE040E30', tipoEquipo: 'Manejadora', marcaNombre: 'Trane' },
    // Daikin
    { modelo: 'FTXN09KVJU', tipoEquipo: 'Mini Split', marcaNombre: 'Daikin' },
    { modelo: 'RXL12Q', tipoEquipo: 'VRV', marcaNombre: 'Daikin' },
    { modelo: 'DMC400N8', tipoEquipo: 'Congelador Comercial', marcaNombre: 'Daikin' },
    // York
    { modelo: 'YCJF36S', tipoEquipo: 'Mini Split', marcaNombre: 'York' },
    { modelo: 'YCP036-1', tipoEquipo: 'Paquete', marcaNombre: 'York' },
    // Lennox
    { modelo: 'XC25-024-230', tipoEquipo: 'Split Inverter', marcaNombre: 'Lennox' },
    { modelo: 'ML14XC1-024', tipoEquipo: 'Split', marcaNombre: 'Lennox' },
    // Rheem
    { modelo: 'RA1336AJ', tipoEquipo: 'Split', marcaNombre: 'Rheem' },
    { modelo: 'RP14AZ36', tipoEquipo: 'Split', marcaNombre: 'Rheem' },
    // Emerson
    { modelo: 'CRS3Q-060', tipoEquipo: 'Condensador Remoto', marcaNombre: 'Emerson' },
    { modelo: 'VRT-100', tipoEquipo: 'Vitrina Refrigerada', marcaNombre: 'Emerson' },
    // Tecumseh
    { modelo: 'AWB5520EXR', tipoEquipo: 'Unidad Condensadora', marcaNombre: 'Tecumseh' },
    { modelo: 'TP124YXK', tipoEquipo: 'Congelador Walk-In', marcaNombre: 'Tecumseh' },
    // Copeland
    { modelo: 'ZP36K5-TFD-540', tipoEquipo: 'Compresor Scroll', marcaNombre: 'Copeland' },
    { modelo: 'CRN3Q-060', tipoEquipo: 'Condensador Remoto', marcaNombre: 'Copeland' },
    // Danfoss
    { modelo: 'SC15G-004', tipoEquipo: 'Unidad Condensadora', marcaNombre: 'Danfoss' },
    { modelo: 'Optyma CA 60', tipoEquipo: 'Rack Condensador', marcaNombre: 'Danfoss' },
    // Refco
    { modelo: 'RC1800-2', tipoEquipo: 'Unidad Condensadora', marcaNombre: 'Refco' },
    { modelo: 'RCE400-1', tipoEquipo: 'Evaporador Comercial', marcaNombre: 'Refco' },
  ]

  const equipos = await db.equipo.createManyAndReturn({
    data: data.map((d) => ({ modelo: d.modelo, tipoEquipo: d.tipoEquipo, idMarca: marcas[brandIdx[d.marcaNombre]].id })),
  })
  console.log(`✅  ${equipos.length} equipos creados.`)
  return equipos
}

// ---------------------------------------------------------------------------
// 5. Products (Productos) – 46 realistic parts
// ---------------------------------------------------------------------------

async function seedProductos(
  marcas: Awaited<ReturnType<typeof seedMarcas>>,
  categorias: Awaited<ReturnType<typeof seedCategorias>>,
) {
  const catIdx: Record<string, number> = {}
  categorias.forEach((c, i) => { catIdx[c.nombre] = i })
  const marIdx: Record<string, number> = {}
  marcas.forEach((m, i) => { marIdx[m.nombre] = i })

  type ProdRow = {
    sku: string
    nombre: string
    descripcion: string
    catNombre?: string
    marNombre?: string
    unidadMedida: string
    costoUnitario: number
    precioVenta: number
    stockMinimo: number
    stockMaximo?: number
  }

  const data: ProdRow[] = [
    // ── Compresores ──────────────────────────────────────────────────
    { sku: 'COMP-001', nombre: 'Compresor Emerson 6103472', descripcion: 'Compresor hermético 1/3 HP R134a para refrigeradores domésticos', catNombre: 'Compresores', marNombre: 'Emerson', unidadMedida: 'pieza', costoUnitario: 1850, precioVenta: 2890, stockMinimo: 5, stockMaximo: 25 },
    { sku: 'COMP-002', nombre: 'Compresor Tecumseh AE1340', descripcion: 'Compresor hermético 1/4 HP R134a para refrigeradores', catNombre: 'Compresores', marNombre: 'Tecumseh', unidadMedida: 'pieza', costoUnitario: 1620, precioVenta: 2540, stockMinimo: 5, stockMaximo: 20 },
    { sku: 'COMP-003', nombre: 'Compresor Copeland ZP36K5-TFD', descripcion: 'Compresor scroll de 3 HP para sistemas comerciales', catNombre: 'Compresores', marNombre: 'Copeland', unidadMedida: 'pieza', costoUnitario: 12400, precioVenta: 18900, stockMinimo: 2, stockMaximo: 8 },
    { sku: 'COMP-004', nombre: 'Compresor Danfoss SC15G', descripcion: 'Compresor 1/2 HP R404A para congeladores comerciales', catNombre: 'Compresores', marNombre: 'Danfoss', unidadMedida: 'pieza', costoUnitario: 3800, precioVenta: 5800, stockMinimo: 3, stockMaximo: 15 },
    { sku: 'COMP-005', nombre: 'Compresor LG CEA84KTCA', descripcion: 'Compresor 1/4 HP R600a para refrigeradores LG', catNombre: 'Compresores', marNombre: 'LG', unidadMedida: 'pieza', costoUnitario: 1480, precioVenta: 2350, stockMinimo: 4, stockMaximo: 18 },

    // ── Condensadores ───────────────────────────────────────────────
    { sku: 'COND-001', nombre: 'Condensador Carrier 30XA-252', descripcion: 'Condensador enfriado por aire 5 toneladas', catNombre: 'Condensadores', marNombre: 'Carrier', unidadMedida: 'pieza', costoUnitario: 15600, precioVenta: 23800, stockMinimo: 2, stockMaximo: 6 },
    { sku: 'COND-002', nombre: 'Condensador Daikin RC1800', descripcion: 'Condensador remoto 1.5 HP para mini splits', catNombre: 'Condensadores', marNombre: 'Daikin', unidadMedida: 'pieza', costoUnitario: 4200, precioVenta: 6500, stockMinimo: 3, stockMaximo: 12 },
    { sku: 'COND-003', nombre: 'Condensador Samsung S-Binder AR18', descripcion: 'Condensador unidad exterior para AR18NQPA', catNombre: 'Condensadores', marNombre: 'Samsung', unidadMedida: 'pieza', costoUnitario: 3100, precioVenta: 4900, stockMinimo: 3, stockMaximo: 10 },

    // ── Evaporadores ─────────────────────────────────────────────────
    { sku: 'EVAP-001', nombre: 'Evaporador Whirlpool W10849832', descripcion: 'Evaporador de aluminio para refrigeradores Whirlpool', catNombre: 'Evaporadores', marNombre: 'Whirlpool', unidadMedida: 'pieza', costoUnitario: 980, precioVenta: 1650, stockMinimo: 6, stockMaximo: 20 },
    { sku: 'EVAP-002', nombre: 'Evaporador Trane TWE040E30', descripcion: 'Evaporador para manejadora de 3 toneladas', catNombre: 'Evaporadores', marNombre: 'Trane', unidadMedida: 'pieza', costoUnitario: 8700, precioVenta: 13200, stockMinimo: 2, stockMaximo: 6 },
    { sku: 'EVAP-003', nombre: 'Evaporador LG 6871JK1005A', descripcion: 'Evaporador para refrigeradores LG', catNombre: 'Evaporadores', marNombre: 'LG', unidadMedida: 'pieza', costoUnitario: 1050, precioVenta: 1780, stockMinimo: 5, stockMaximo: 15 },

    // ── Termostatos ──────────────────────────────────────────────────
    { sku: 'TERM-001', nombre: 'Termostato Whirlpool W10847901', descripcion: 'Termostato digital de descongelamiento', catNombre: 'Termostatos', marNombre: 'Whirlpool', unidadMedida: 'pieza', costoUnitario: 320, precioVenta: 580, stockMinimo: 10, stockMaximo: 40 },
    { sku: 'TERM-002', nombre: 'Termostato Samsung DA32-00006W', descripcion: 'Termostato digital para refrigeradores Samsung', catNombre: 'Termostatos', marNombre: 'Samsung', unidadMedida: 'pieza', costoUnitario: 350, precioVenta: 620, stockMinimo: 8, stockMaximo: 35 },
    { sku: 'TERM-003', nombre: 'Termostato Carrier KJ3102AA01', descripcion: 'Termostato wall-mounted para mini splits Carrier', catNombre: 'Termostatos', marNombre: 'Carrier', unidadMedida: 'pieza', costoUnitario: 890, precioVenta: 1450, stockMinimo: 5, stockMaximo: 20 },
    { sku: 'TERM-004', nombre: 'Termostato York 031-01238-000', descripcion: 'Termostato de seguridad para equipos York', catNombre: 'Termostatos', marNombre: 'York', unidadMedida: 'pieza', costoUnitario: 520, precioVenta: 890, stockMinimo: 4, stockMaximo: 15 },

    // ── Válvulas ───────────────────────────────────────────────────
    { sku: 'VALV-001', nombre: 'Válvula de Expansión Danfoss TXV-06', descripcion: 'Válvula termostática de expansión 1/2 ton', catNombre: 'Válvulas', marNombre: 'Danfoss', unidadMedida: 'pieza', costoUnitario: 450, precioVenta: 780, stockMinimo: 8, stockMaximo: 30 },
    { sku: 'VALV-002', nombre: 'Válvula Solenoide Samsung SGR-E603A', descripcion: 'Válvula solenoide para refrigeradores Samsung', catNombre: 'Válvulas', marNombre: 'Samsung', unidadMedida: 'pieza', costoUnitario: 280, precioVenta: 490, stockMinimo: 6, stockMaximo: 25 },
    { sku: 'VALV-003', nombre: 'Válvula Inversora 4 Vías LG', descripcion: 'Válvula inversora de 4 vías para mini splits LG', catNombre: 'Válvulas', marNombre: 'LG', unidadMedida: 'pieza', costoUnitario: 1100, precioVenta: 1850, stockMinimo: 4, stockMaximo: 15 },
    { sku: 'VALV-004', nombre: 'Válvula de Servicio Emerson 9179-Z22', descripcion: 'Válvula de servicio para sistemas de refrigeración', catNombre: 'Válvulas', marNombre: 'Emerson', unidadMedida: 'pieza', costoUnitario: 380, precioVenta: 650, stockMinimo: 10, stockMaximo: 40 },

    // ── Tubos y Conexiones ──────────────────────────────────────────
    { sku: 'TUBE-001', nombre: 'Tubo de Cobre 1/4" x 3m', descripcion: 'Tubo de cobre tipo L diámetro 1/4 pulgada, 3 metros', catNombre: 'Tubos y Conexiones', unidadMedida: 'pieza', costoUnitario: 85, precioVenta: 155, stockMinimo: 20, stockMaximo: 100 },
    { sku: 'TUBE-002', nombre: 'Tubo de Cobre 3/8" x 3m', descripcion: 'Tubo de cobre tipo L diámetro 3/8 pulgada, 3 metros', catNombre: 'Tubos y Conexiones', unidadMedida: 'pieza', costoUnitario: 120, precioVenta: 210, stockMinimo: 20, stockMaximo: 80 },
    { sku: 'TUBE-003', nombre: 'Conector Flare 1/4" SAE (par)', descripcion: 'Conector tipo flare para tubería 1/4", juego de 2 piezas', catNombre: 'Tubos y Conexiones', unidadMedida: 'par', costoUnitario: 25, precioVenta: 55, stockMinimo: 30, stockMaximo: 150 },
    { sku: 'TUBE-004', nombre: 'Accesorio Unión Directa 3/8"', descripcion: 'Unión directa de bronce para tubería 3/8"', catNombre: 'Tubos y Conexiones', unidadMedida: 'pieza', costoUnitario: 35, precioVenta: 70, stockMinimo: 25, stockMaximo: 100 },

    // ── Filtros ─────────────────────────────────────────────────────
    { sku: 'FILT-001', nombre: 'Filtro Secador Emerson 0068813', descripcion: 'Filtro secador para sistemas R134a', catNombre: 'Filtros', marNombre: 'Emerson', unidadMedida: 'pieza', costoUnitario: 95, precioVenta: 180, stockMinimo: 12, stockMaximo: 50 },
    { sku: 'FILT-002', nombre: 'Filtro Secador Samsung DA32-00008A', descripcion: 'Filtro secador para refrigeradores Samsung', catNombre: 'Filtros', marNombre: 'Samsung', unidadMedida: 'pieza', costoUnitario: 110, precioVenta: 200, stockMinimo: 10, stockMaximo: 40 },
    { sku: 'FILT-003', nombre: 'Filtro de Línea LG TAC-22006201', descripcion: 'Filtro de línea para sistemas LG', catNombre: 'Filtros', marNombre: 'LG', unidadMedida: 'pieza', costoUnitario: 105, precioVenta: 195, stockMinimo: 8, stockMaximo: 35 },
    { sku: 'FILT-004', nombre: 'Filtro Secador Danfoss 032N5400', descripcion: 'Filtro secador para sistemas R404A', catNombre: 'Filtros', marNombre: 'Danfoss', unidadMedida: 'pieza', costoUnitario: 130, precioVenta: 240, stockMinimo: 10, stockMaximo: 45 },

    // ── Motores ─────────────────────────────────────────────────────
    { sku: 'MOTO-001', nombre: 'Motor Ventilador Whirlpool W10608569', descripcion: 'Motor de ventilador de condensador para refrigeradores Whirlpool', catNombre: 'Motores', marNombre: 'Whirlpool', unidadMedida: 'pieza', costoUnitario: 680, precioVenta: 1100, stockMinimo: 5, stockMaximo: 20 },
    { sku: 'MOTO-002', nombre: 'Motor Evaporador Samsung ADQ747233', descripcion: 'Motor ventilador para evaporador Samsung', catNombre: 'Motores', marNombre: 'Samsung', unidadMedida: 'pieza', costoUnitario: 720, precioVenta: 1180, stockMinimo: 5, stockMaximo: 18 },
    { sku: 'MOTO-003', nombre: 'Motor Condensador Carrier HC42TE119', descripcion: 'Motor de condensador 1/2 HP para sistemas Carrier', catNombre: 'Motores', marNombre: 'Carrier', unidadMedida: 'pieza', costoUnitario: 2100, precioVenta: 3400, stockMinimo: 3, stockMaximo: 12 },
    { sku: 'MOTO-004', nombre: 'Motor Ventilador Mabe 4956-281-100', descripcion: 'Motor ventilador para refrigeradores Mabe', catNombre: 'Motores', marNombre: 'Mabe', unidadMedida: 'pieza', costoUnitario: 550, precioVenta: 920, stockMinimo: 4, stockMaximo: 15 },

    // ── Resistencias ────────────────────────────────────────────────
    { sku: 'RESI-001', nombre: 'Resistencia Descongelamiento W10325908', descripcion: 'Resistencia de descongelamiento para Whirlpool', catNombre: 'Resistencias', marNombre: 'Whirlpool', unidadMedida: 'pieza', costoUnitario: 180, precioVenta: 320, stockMinimo: 10, stockMaximo: 40 },
    { sku: 'RESI-002', nombre: 'Resistencia Evaporador Samsung DA47-00165A', descripcion: 'Resistencia de descongelamiento para Samsung', catNombre: 'Resistencias', marNombre: 'Samsung', unidadMedida: 'pieza', costoUnitario: 195, precioVenta: 350, stockMinimo: 8, stockMaximo: 30 },
    { sku: 'RESI-003', nombre: 'Resistencia Drenaje LG 5001EL3001A', descripcion: 'Resistencia de drenaje para refrigeradores LG', catNombre: 'Resistencias', marNombre: 'LG', unidadMedida: 'pieza', costoUnitario: 160, precioVenta: 290, stockMinimo: 8, stockMaximo: 35 },

    // ── Gas Refrigerante ─────────────────────────────────────────────
    { sku: 'GAS-001', nombre: 'Gas R134a Cilindro 13.6 kg', descripcion: 'Gas refrigerante R134a en cilindro recargable 13.6 kg', catNombre: 'Gas Refrigerante', unidadMedida: 'cilindro', costoUnitario: 680, precioVenta: 1100, stockMinimo: 8, stockMaximo: 30 },
    { sku: 'GAS-002', nombre: 'Gas R410A Cilindro 11.3 kg', descripcion: 'Gas refrigerante R410A en cilindro recargable 11.3 kg', catNombre: 'Gas Refrigerante', unidadMedida: 'cilindro', costoUnitario: 850, precioVenta: 1380, stockMinimo: 6, stockMaximo: 25 },
    { sku: 'GAS-003', nombre: 'Gas R404A Cilindro 10.9 kg', descripcion: 'Gas refrigerante R404A en cilindro recargable 10.9 kg', catNombre: 'Gas Refrigerante', unidadMedida: 'cilindro', costoUnitario: 1200, precioVenta: 1950, stockMinimo: 4, stockMaximo: 15 },
    { sku: 'GAS-004', nombre: 'Gas R600a Cilindro 5 kg', descripcion: 'Gas refrigerante R600a (isobutano) en cilindro 5 kg', catNombre: 'Gas Refrigerante', unidadMedida: 'cilindro', costoUnitario: 320, precioVenta: 520, stockMinimo: 10, stockMaximo: 40 },

    // ── Repuestos Eléctricos ────────────────────────────────────────
    { sku: 'RELE-001', nombre: 'Relé Start Emerson 3ARR3', descripcion: 'Relé de arranque para compresores Emerson', catNombre: 'Repuestos Eléctricos', marNombre: 'Emerson', unidadMedida: 'pieza', costoUnitario: 85, precioVenta: 155, stockMinimo: 15, stockMaximo: 60 },
    { sku: 'RELE-002', nombre: 'Capacitor Samsung 25 µF 370V', descripcion: 'Capacitor de arranque 25 microfaradios 370V', catNombre: 'Repuestos Eléctricos', marNombre: 'Samsung', unidadMedida: 'pieza', costoUnitario: 120, precioVenta: 220, stockMinimo: 12, stockMaximo: 50 },
    { sku: 'RELE-003', nombre: 'Protector Térmico Copeland 041-0219-00', descripcion: 'Protector térmico para compresores Copeland scroll', catNombre: 'Repuestos Eléctricos', marNombre: 'Copeland', unidadMedida: 'pieza', costoUnitario: 150, precioVenta: 280, stockMinimo: 8, stockMaximo: 30 },
    { sku: 'RELE-004', nombre: 'Tarjeta Electrónica LG EBR69501702', descripcion: 'Tarjeta electrónica de control principal para LG', catNombre: 'Repuestos Eléctricos', marNombre: 'LG', unidadMedida: 'pieza', costoUnitario: 1850, precioVenta: 2900, stockMinimo: 3, stockMaximo: 10 },

    // ── Sellos y Juntas ─────────────────────────────────────────────
    { sku: 'SELLO-001', nombre: 'Sello Compresor Tecumseh 97040', descripcion: 'Kit de sellos para compresores Tecumseh herméticos', catNombre: 'Sellos y Juntas', marNombre: 'Tecumseh', unidadMedida: 'kit', costoUnitario: 45, precioVenta: 90, stockMinimo: 20, stockMaximo: 80 },
    { sku: 'SELLO-002', nombre: 'Junta Puerta Whirlpool W10304482', descripcion: 'Junta de puerta (burlete) para refrigeradores Whirlpool', catNombre: 'Sellos y Juntas', marNombre: 'Whirlpool', unidadMedida: 'pieza', costoUnitario: 180, precioVenta: 340, stockMinimo: 10, stockMaximo: 40 },
    { sku: 'SELLO-003', nombre: 'Kit Juntas Danfoss 084N7305', descripcion: 'Kit de juntas para válvulas Danfoss', catNombre: 'Sellos y Juntas', marNombre: 'Danfoss', unidadMedida: 'kit', costoUnitario: 75, precioVenta: 145, stockMinimo: 15, stockMaximo: 50 },
    { sku: 'SELLO-004', nombre: 'Sello Válvula 4 Vías Refco RC-4WV', descripcion: 'Sello de reposición para válvula de 4 vías', catNombre: 'Sellos y Juntas', marNombre: 'Refco', unidadMedida: 'pieza', costoUnitario: 55, precioVenta: 110, stockMinimo: 10, stockMaximo: 40 },
  ]

  const productos = await db.producto.createManyAndReturn({
    data: data.map((d) => ({
      sku: d.sku,
      nombre: d.nombre,
      descripcion: d.descripcion,
      idCategoria: d.catNombre ? categorias[catIdx[d.catNombre]].id : undefined,
      idMarca: d.marNombre ? marcas[marIdx[d.marNombre]].id : undefined,
      unidadMedida: d.unidadMedida,
      costoUnitario: d.costoUnitario,
      precioVenta: d.precioVenta,
      stockMinimo: d.stockMinimo,
      stockMaximo: d.stockMaximo,
      activo: true,
      fechaCreacion: daysAgo(Math.floor(Math.random() * 365), 9),
    })),
  })
  console.log(`✅  ${productos.length} productos creados.`)
  return productos
}

// ---------------------------------------------------------------------------
// 6. Producto-Equipo compatibility (N:M)
// ---------------------------------------------------------------------------

async function seedProductoEquipo(
  productos: Awaited<ReturnType<typeof seedProductos>>,
  equipos: Awaited<ReturnType<typeof seedEquipos>>,
) {
  // Each tuple is [productIndex, equipmentIndex] into the respective arrays
  const pairs: [number, number][] = [
    // COMP-001 (Emerson compressor)
    [0, 0], [0, 1], [0, 9], [0, 28],
    // COMP-002 (Tecumseh compressor)
    [1, 2], [1, 10], [1, 30], [1, 28],
    // COMP-003 (Copeland scroll)
    [2, 13], [2, 14], [2, 15], [2, 32],
    // COMP-004 (Danfoss compressor)
    [3, 20], [3, 33], [3, 34],
    // COMP-005 (LG compressor)
    [4, 6], [4, 7],
    // COND-001 (Carrier condenser)
    [5, 11], [5, 12], [5, 14],
    // COND-002 (Daikin condenser)
    [6, 18], [6, 19], [6, 20],
    // COND-003 (Samsung condenser)
    [7, 5], [7, 3],
    // EVAP-001 (Whirlpool evaporator)
    [8, 0], [8, 1], [8, 2],
    // EVAP-002 (Trane evaporator)
    [9, 17], [9, 15], [9, 16], [9, 23], [9, 24], [9, 13],
    // EVAP-003 (LG evaporator)
    [10, 6], [10, 7],
    // TERM-001 (Whirlpool thermostat)
    [11, 0], [11, 1], [11, 9],
    // TERM-002 (Samsung thermostat)
    [12, 3], [12, 4], [12, 5],
    // TERM-003 (Carrier thermostat)
    [13, 11], [13, 12], [13, 14], [13, 25], [13, 26],
    // TERM-004 (York thermostat)
    [14, 21], [14, 22], [14, 25], [14, 26],
    // VALV-001 (Danfoss TXV)
    [15, 20], [15, 18], [15, 33], [15, 36], [15, 34],
    // VALV-002 (Samsung solenoid)
    [16, 3], [16, 4], [16, 5],
    // VALV-003 (LG 4-way valve)
    [17, 8], [17, 5], [17, 11],
    // VALV-004 (Emerson service valve)
    [18, 27], [18, 28], [18, 29], [18, 33], [18, 34], [18, 35],
    // TUBE-001 (Copper 1/4") – universal for small systems
    [19, 0], [19, 3], [19, 6], [19, 9], [19, 28], [19, 4], [19, 10], [19, 33],
    // TUBE-002 (Copper 3/8") – universal for mini-splits / splits
    [20, 11], [20, 15], [20, 19], [20, 5], [20, 16], [20, 13], [20, 22], [20, 23], [20, 24], [20, 25], [20, 26], [20, 30], [20, 33], [20, 35], [20, 34],
    // TUBE-003 (Flare connector)
    [21, 2], [21, 4], [21, 7], [21, 10],
    // TUBE-004 (Union fitting)
    [22, 12], [22, 14], [22, 17], [22, 22],
    // FILT-001 (Emerson filter drier)
    [23, 0], [23, 1], [23, 9], [23, 27], [23, 29],
    // FILT-002 (Samsung filter drier)
    [24, 3], [24, 4],
    // FILT-003 (LG filter)
    [25, 6], [25, 7], [25, 8], [25, 23],
    // FILT-004 (Danfoss filter drier)
    [26, 20], [26, 33], [26, 30], [26, 32], [26, 35],
    // MOTO-001 (Whirlpool fan motor)
    [27, 0], [27, 1], [27, 2], [27, 9],
    // MOTO-002 (Samsung evaporator motor)
    [28, 3], [28, 4], [28, 5],
    // MOTO-003 (Carrier condenser motor)
    [29, 11], [29, 12], [29, 14], [29, 21], [29, 17],
    // MOTO-004 (Mabe fan motor)
    [30, 10], [30, 9], [30, 28],
    // RESI-001 (Whirlpool defrost heater)
    [31, 0], [31, 1], [31, 2],
    // RESI-002 (Samsung evaporator heater)
    [32, 3], [32, 4],
    // RESI-003 (LG drain heater)
    [33, 6], [33, 7],
    // GAS-001 (R134a)
    [34, 0], [34, 1], [34, 3], [34, 4], [34, 6], [34, 7], [34, 9], [34, 10],
    // GAS-002 (R410A)
    [35, 5], [35, 8], [35, 11], [35, 15], [35, 18], [35, 21], [35, 23], [35, 13], [35, 16], [35, 19], [35, 22], [35, 24], [35, 25], [35, 26],
    // GAS-003 (R404A)
    [36, 20], [36, 33], [36, 30], [36, 32], [36, 36], [36, 34],
    // GAS-004 (R600a)
    [37, 10], [37, 2], [37, 7],
    // RELE-001 (Emerson start relay)
    [38, 27], [38, 28], [38, 0], [38, 9],
    // RELE-002 (Samsung capacitor)
    [39, 5], [39, 3], [39, 11],
    // RELE-003 (Copeland thermal protector)
    [40, 31], [40, 32], [40, 13],
    // RELE-004 (LG electronic board)
    [41, 8], [41, 6],
    // SELLO-001 (Tecumseh compressor seal)
    [42, 29], [42, 30], [42, 31],
    // SELLO-002 (Whirlpool door gasket)
    [43, 0], [43, 1], [43, 2],
    // SELLO-003 (Danfoss gasket kit)
    [44, 33], [44, 34], [44, 20],
    // SELLO-004 (Refco 4-way valve seal)
    [45, 35], [45, 36], [45, 27],
  ]

  // De-duplicate (safety)
  const unique = new Set<string>()
  const filtered = pairs.filter(([p, e]) => {
    const key = `${p}-${e}`
    if (unique.has(key)) return false
    unique.add(key)
    return true
  })

  await db.productoEquipo.createMany({
    data: filtered.map(([pi, ei]) => ({
      idProducto: productos[pi].id,
      idEquipo: equipos[ei].id,
    })),
  })
  console.log(`✅  ${filtered.length} relaciones producto-equipo creadas.`)
}

// ---------------------------------------------------------------------------
// 7. Locations (Ubicaciones) – 2 aisles × 3 shelves × 2 levels = 12
// ---------------------------------------------------------------------------

async function seedUbicaciones() {
  const data: Prisma.UbicacionCreateInput[] = []
  for (const pasillo of ['A', 'B']) {
    for (const estante of ['1', '2', '3']) {
      for (const nivel of ['1', '2']) {
        data.push({ pasillo, estante, nivel, activo: true })
      }
    }
  }

  const ubicaciones = await Promise.all(data.map((d) => db.ubicacion.create({ data: d })))
  console.log(`✅  ${ubicaciones.length} ubicaciones creadas.`)
  return ubicaciones
}

// ---------------------------------------------------------------------------
// 8. Stock entries
// ---------------------------------------------------------------------------

async function seedStock(
  productos: Awaited<ReturnType<typeof seedProductos>>,
  ubicaciones: Awaited<ReturnType<typeof seedUbicaciones>>,
) {
  const stockData: Prisma.StockCreateManyInput[] = []

  for (const producto of productos) {
    const totalStock = Math.floor(Math.random() * 51) // 0–50
    // Pick 1–3 random locations for each product
    const numLocations = Math.min(ubicaciones.length, Math.floor(Math.random() * 3) + 1)
    const shuffled = [...ubicaciones].sort(() => Math.random() - 0.5).slice(0, numLocations)
    const amounts = distributeStock(totalStock, numLocations)

    for (let i = 0; i < shuffled.length; i++) {
      if (amounts[i] > 0) {
        stockData.push({
          idProducto: producto.id,
          idUbicacion: shuffled[i].id,
          cantidad: amounts[i],
        })
      }
    }
  }

  await db.stock.createMany({ data: stockData })
  console.log(`✅  ${stockData.length} registros de stock creados.`)
}

// ---------------------------------------------------------------------------
// 9. Movement types
// ---------------------------------------------------------------------------

async function seedTiposMovimiento() {
  const nombres = ['ENTRADA', 'SALIDA', 'AJUSTE', 'TRASLADO', 'DEVOLUCION']
  const tipos = await db.tipoMovimiento.createManyAndReturn({
    data: nombres.map((n) => ({ nombre: n })),
  })
  console.log(`✅  ${tipos.length} tipos de movimiento creados.`)
  return tipos
}

// ---------------------------------------------------------------------------
// 10. Clients (Técnicos)
// ---------------------------------------------------------------------------

async function seedClientes() {
  const data: Prisma.ClienteCreateInput[] = [
    { nombre: 'Carlos Ramírez Hernández', telefono: '55 1234 5678', email: 'carlos.ramirez@refri-mx.com', tipoCliente: 'Técnico', fechaRegistro: daysAgo(180, 9) },
    { nombre: 'Miguel Ángel Torres', telefono: '55 2345 6789', email: 'mtorres@airefrio.com', tipoCliente: 'Técnico', fechaRegistro: daysAgo(150, 10) },
    { nombre: 'Roberto García López', telefono: '33 3456 7890', email: 'roberto.garcia@frioexpress.mx', tipoCliente: 'Técnico', fechaRegistro: daysAgo(120, 9) },
    { nombre: 'Fernando Martínez Díaz', telefono: '55 4567 8901', email: 'fmartinez@climacool.com', tipoCliente: 'Técnico', fechaRegistro: daysAgo(90, 11) },
    { nombre: 'José Luis Sánchez Vega', telefono: '81 5678 9012', email: 'jlsanchez@refri Monterrey.com', tipoCliente: 'Técnico', fechaRegistro: daysAgo(75, 8) },
    { nombre: 'Eduardo Vargas Ruiz', telefono: '222 6789 0123', email: 'evargas@aire-puebla.mx', tipoCliente: 'Técnico', fechaRegistro: daysAgo(60, 10) },
    { nombre: 'Alejandro Morales Castillo', telefono: '55 7890 1234', email: 'amorales@hvacsolutions.mx', tipoCliente: 'Técnico', fechaRegistro: daysAgo(45, 9) },
    { nombre: 'Raúl Espinoza Castro', telefono: '664 8901 2345', email: 'raul.espinoza@tj-refri.com', tipoCliente: 'Técnico', fechaRegistro: daysAgo(30, 11) },
    { nombre: 'Daniel Pacheco Mendoza', telefono: '55 9012 3456', email: 'dpacheco@frio-mx.net', tipoCliente: 'Técnico', fechaRegistro: daysAgo(20, 10) },
    { nombre: 'Andrés Jiménez Flores', telefono: '33 0123 4567', email: 'ajimenez@guadalajarafrio.mx', tipoCliente: 'Técnico', fechaRegistro: daysAgo(10, 9) },
    { nombre: 'Luis Fernando Rojas', telefono: '777 1234 5670', email: 'lrojas@morelosclima.com', tipoCliente: 'Técnico', fechaRegistro: daysAgo(5, 8) },
  ]

  const clientes = await Promise.all(data.map((d) => db.cliente.create({ data: d })))
  console.log(`✅  ${clientes.length} clientes creados.`)
  return clientes
}

// ---------------------------------------------------------------------------
// 11. Sales & VentaDetalle (15+ sales)
// ---------------------------------------------------------------------------

async function seedVentas(
  clientes: Awaited<ReturnType<typeof seedClientes>>,
  productos: Awaited<ReturnType<typeof seedProductos>>,
  ubicaciones: Awaited<ReturnType<typeof seedUbicaciones>>,
  tiposMov: Awaited<ReturnType<typeof seedTiposMovimiento>>,
) {
  // Index productos by SKU for quick lookup
  const prodBySku: Record<string, typeof productos[0]> = {}
  productos.forEach((p) => { prodBySku[p.sku] = p })

  // Common "store" users
  const users = ['Admin', 'María López', 'Juan Pérez']

  type SaleSpec = {
    dayAgo: number
    hour: number
    clientIdx: number
    items: { sku: string; qty: number }[]
    estado: string
  }

  const ventasSpec: SaleSpec[] = [
    { dayAgo: 29, hour: 10, clientIdx: 0, items: [
      { sku: 'COMP-001', qty: 1 },
      { sku: 'FILT-001', qty: 2 },
      { sku: 'RELE-001', qty: 2 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 27, hour: 14, clientIdx: 1, items: [
      { sku: 'GAS-002', qty: 2 },
      { sku: 'TUBE-002', qty: 4 },
      { sku: 'VALV-001', qty: 1 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 25, hour: 9, clientIdx: 2, items: [
      { sku: 'EVAP-001', qty: 1 },
      { sku: 'MOTO-001', qty: 1 },
      { sku: 'TUBE-001', qty: 3 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 23, hour: 11, clientIdx: 3, items: [
      { sku: 'COMP-003', qty: 1 },
      { sku: 'COND-001', qty: 1 },
      { sku: 'RELE-003', qty: 2 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 22, hour: 16, clientIdx: 4, items: [
      { sku: 'TERM-001', qty: 3 },
      { sku: 'RESI-001', qty: 2 },
      { sku: 'SELLO-002', qty: 2 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 20, hour: 10, clientIdx: 5, items: [
      { sku: 'MOTO-003', qty: 2 },
      { sku: 'TUBE-002', qty: 3 },
      { sku: 'FILT-001', qty: 1 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 18, hour: 13, clientIdx: 6, items: [
      { sku: 'COND-002', qty: 1 },
      { sku: 'VALV-003', qty: 2 },
      { sku: 'RELE-002', qty: 3 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 17, hour: 9, clientIdx: 7, items: [
      { sku: 'GAS-001', qty: 1 },
      { sku: 'GAS-004', qty: 2 },
      { sku: 'TUBE-003', qty: 5 },
      { sku: 'FILT-002', qty: 2 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 15, hour: 15, clientIdx: 0, items: [
      { sku: 'COMP-002', qty: 1 },
      { sku: 'EVAP-001', qty: 1 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 14, hour: 10, clientIdx: 8, items: [
      { sku: 'RELE-004', qty: 1 },
      { sku: 'MOTO-002', qty: 2 },
      { sku: 'GAS-002', qty: 1 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 12, hour: 11, clientIdx: 9, items: [
      { sku: 'COMP-005', qty: 2 },
      { sku: 'FILT-003', qty: 2 },
      { sku: 'TUBE-001', qty: 4 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 10, hour: 14, clientIdx: 10, items: [
      { sku: 'VALV-002', qty: 3 },
      { sku: 'RESI-002', qty: 1 },
      { sku: 'SELLO-003', qty: 2 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 8, hour: 9, clientIdx: 3, items: [
      { sku: 'COND-003', qty: 1 },
      { sku: 'TUBE-002', qty: 2 },
      { sku: 'GAS-002', qty: 1 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 5, hour: 16, clientIdx: 1, items: [
      { sku: 'GAS-003', qty: 2 },
      { sku: 'COMP-004', qty: 1 },
      { sku: 'FILT-004', qty: 2 },
      { sku: 'TUBE-002', qty: 3 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 3, hour: 10, clientIdx: 5, items: [
      { sku: 'MOTO-004', qty: 1 },
      { sku: 'SELLO-001', qty: 3 },
      { sku: 'RESI-003', qty: 2 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 2, hour: 11, clientIdx: 7, items: [
      { sku: 'TERM-003', qty: 1 },
      { sku: 'VALV-001', qty: 2 },
      { sku: 'TUBE-004', qty: 4 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 1, hour: 14, clientIdx: 9, items: [
      { sku: 'EVAP-003', qty: 1 },
      { sku: 'COMP-005', qty: 1 },
      { sku: 'GAS-004', qty: 1 },
    ], estado: 'COMPLETADA' },
    { dayAgo: 1, hour: 16, clientIdx: 10, items: [
      { sku: 'RELE-001', qty: 4 },
      { sku: 'TUBE-001', qty: 6 },
      { sku: 'FILT-001', qty: 3 },
    ], estado: 'PENDIENTE' },
  ]

  const salidaTipo = tiposMov.find((t) => t.nombre === 'SALIDA')!

  for (const spec of ventasSpec) {
    const fecha = daysAgo(spec.dayAgo, spec.hour)
    const folio = `V-${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}-${String(ventasSpec.indexOf(spec) + 1).padStart(4, '0')}`

    const detalles = spec.items.map((item) => {
      const prod = prodBySku[item.sku]
      return { idProducto: prod.id, cantidad: item.qty, precioUnitario: prod.precioVenta }
    })

    const subtotal = detalles.reduce((sum, d) => sum + d.cantidad * d.precioUnitario, 0)
    // No IVA included – simple subtotal = total
    const total = subtotal

    const venta = await db.venta.create({
      data: {
        idCliente: clientes[spec.clientIdx].id,
        folio,
        fecha,
        subtotal,
        total,
        estado: spec.estado,
        detalles: { create: detalles },
      },
    })

    // Create SALIDA movements for each item
    for (const det of detalles) {
      await db.movimiento.create({
        data: {
          idProducto: det.idProducto,
          idUbicacion: ubicaciones[Math.floor(Math.random() * ubicaciones.length)].id,
          idTipo: salidaTipo.id,
          cantidad: det.cantidad,
          costoUnitario: prodBySku[spec.items[detalles.indexOf(det)].sku].costoUnitario,
          referencia: `Venta ${venta.folio}`,
          usuario: users[Math.floor(Math.random() * users.length)],
          observacion: 'Salida por venta',
          fecha,
        },
      })
    }
  }

  console.log(`✅  ${ventasSpec.length} ventas con detalles creadas.`)
}

// ---------------------------------------------------------------------------
// 12. Movements (30+ extra entries/outputs over last 30 days)
// ---------------------------------------------------------------------------

async function seedMovimientos(
  productos: Awaited<ReturnType<typeof seedProductos>>,
  ubicaciones: Awaited<ReturnType<typeof seedUbicaciones>>,
  tiposMov: Awaited<ReturnType<typeof seedTiposMovimiento>>,
) {
  const entradaTipo = tiposMov.find((t) => t.nombre === 'ENTRADA')!
  const salidaTipo = tiposMov.find((t) => t.nombre === 'SALIDA')!
  const ajusteTipo = tiposMov.find((t) => t.nombre === 'AJUSTE')!
  const trasladoTipo = tiposMov.find((t) => t.nombre === 'TRASLADO')!
  const devolucionTipo = tiposMov.find((t) => t.nombre === 'DEVOLUCION')!

  const users = ['Admin', 'María López', 'Juan Pérez']

  type MovSpec = {
    dayAgo: number; hour: number
    prodIdx: number
    tipo: string
    cantidad: number
    referencia?: string
    observacion?: string
  }

  const extraMovs: MovSpec[] = [
    // ENTRADAS – purchases / returns from suppliers
    { dayAgo: 28, hour: 9, prodIdx: 0, tipo: 'ENTRADA', cantidad: 5, referencia: 'OC-2024-0451', observacion: 'Recepción de proveedor Emerson' },
    { dayAgo: 26, hour: 10, prodIdx: 1, tipo: 'ENTRADA', cantidad: 8, referencia: 'OC-2024-0452', observacion: 'Recepción de proveedor Tecumseh' },
    { dayAgo: 24, hour: 8, prodIdx: 2, tipo: 'ENTRADA', cantidad: 2, referencia: 'OC-2024-0453', observacion: 'Recepción de proveedor Copeland' },
    { dayAgo: 21, hour: 9, prodIdx: 34, tipo: 'ENTRADA', cantidad: 10, referencia: 'OC-2024-0454', observacion: 'Cilindros R134a – prov. Quimoba' },
    { dayAgo: 19, hour: 11, prodIdx: 35, tipo: 'ENTRADA', cantidad: 8, referencia: 'OC-2024-0455', observacion: 'Cilindros R410A – prov. Quimoba' },
    { dayAgo: 16, hour: 10, prodIdx: 19, tipo: 'ENTRADA', cantidad: 50, referencia: 'OC-2024-0456', observacion: 'Tubos de cobre 1/4" – lote completo' },
    { dayAgo: 16, hour: 10, prodIdx: 20, tipo: 'ENTRADA', cantidad: 40, referencia: 'OC-2024-0456', observacion: 'Tubos de cobre 3/8" – lote completo' },
    { dayAgo: 13, hour: 9, prodIdx: 36, tipo: 'ENTRADA', cantidad: 5, referencia: 'OC-2024-0457', observacion: 'Gas R404A – prov. Chemours' },
    { dayAgo: 11, hour: 14, prodIdx: 38, tipo: 'ENTRADA', cantidad: 20, referencia: 'OC-2024-0458', observacion: 'Reles de arranque Emerson' },
    { dayAgo: 7, hour: 10, prodIdx: 5, tipo: 'ENTRADA', cantidad: 3, referencia: 'OC-2024-0459', observacion: 'Condensadores Carrier' },
    { dayAgo: 6, hour: 9, prodIdx: 6, tipo: 'ENTRADA', cantidad: 4, referencia: 'OC-2024-0460', observacion: 'Condensadores Daikin' },
    { dayAgo: 4, hour: 11, prodIdx: 15, tipo: 'ENTRADA', cantidad: 15, referencia: 'OC-2024-0461', observacion: 'Válvulas TXV Danfoss' },

    // DEVOLUCIONES – product returned from technicians
    { dayAgo: 22, hour: 15, prodIdx: 12, tipo: 'DEVOLUCION', cantidad: 1, referencia: 'DEV-001', observacion: 'Termostato Samsung defectuoso – devolución cliente' },
    { dayAgo: 14, hour: 16, prodIdx: 29, tipo: 'DEVOLUCION', cantidad: 1, referencia: 'DEV-002', observacion: 'Motor Carrier devuelto – no requerido' },

    // AJUSTES – stock corrections
    { dayAgo: 20, hour: 12, prodIdx: 21, tipo: 'AJUSTE', cantidad: -3, observacion: 'Ajuste por conteo físico – sobrante' },
    { dayAgo: 17, hour: 10, prodIdx: 22, tipo: 'AJUSTE', cantidad: 2, observacion: 'Ajuste por conteo físico – faltante' },
    { dayAgo: 9, hour: 13, prodIdx: 37, tipo: 'AJUSTE', cantidad: -1, observacion: 'Cilindro R600a con fuga – descartado' },
    { dayAgo: 6, hour: 11, prodIdx: 43, tipo: 'AJUSTE', cantidad: -2, observacion: 'Ajuste por inventario semanal' },

    // TRASLADOS – internal moves between locations
    { dayAgo: 18, hour: 9, prodIdx: 3, tipo: 'TRASLADO', cantidad: 3, observacion: 'Traslado del pasillo B al pasillo A para mejor acceso' },
    { dayAgo: 12, hour: 14, prodIdx: 25, tipo: 'TRASLADO', cantidad: 4, observacion: 'Reorganización de filtros LG' },
    { dayAgo: 8, hour: 10, prodIdx: 30, tipo: 'TRASLADO', cantidad: 2, observacion: 'Motores Mabe reubicados' },

    // SALIDAS extra (non-sale)
    { dayAgo: 24, hour: 16, prodIdx: 11, tipo: 'SALIDA', cantidad: 1, referencia: 'SAL-001', observacion: 'Garantía – termostato para cliente final' },
    { dayAgo: 15, hour: 12, prodIdx: 31, tipo: 'SALIDA', cantidad: 2, referencia: 'SAL-002', observacion: 'Préstamo para servicio en campo' },
    { dayAgo: 9, hour: 11, prodIdx: 28, tipo: 'SALIDA', cantidad: 1, referencia: 'SAL-003', observacion: 'Reemplazo en garantía Samsung' },
  ]

  const movimientoData: Prisma.MovimientoCreateManyInput[] = extraMovs.map((m) => {
    const tipoMap: Record<string, number> = {
      ENTRADA: entradaTipo.id,
      SALIDA: salidaTipo.id,
      AJUSTE: ajusteTipo.id,
      TRASLADO: trasladoTipo.id,
      DEVOLUCION: devolucionTipo.id,
    }
    return {
      idProducto: productos[m.prodIdx].id,
      idUbicacion: ubicaciones[Math.floor(Math.random() * ubicaciones.length)].id,
      idTipo: tipoMap[m.tipo],
      cantidad: Math.abs(m.cantidad), // Store as positive; sign conveyed by tipo
      costoUnitario: productos[m.prodIdx].costoUnitario,
      referencia: m.referencia,
      usuario: users[Math.floor(Math.random() * users.length)],
      observacion: m.observacion,
      fecha: daysAgo(m.dayAgo, m.hour),
    }
  })

  await db.movimiento.createMany({ data: movimientoData })
  console.log(`✅  ${movimientoData.length} movimientos adicionales creados.`)
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

export async function seed() {
  console.log('🌱 Starting WMS seed…')
  console.log('='.repeat(50))

  await clearAll()

  // 1. Independent catalog tables
  const marcas = await seedMarcas()
  const categorias = await seedCategorias()
  const ubicaciones = await seedUbicaciones()
  const tiposMov = await seedTiposMovimiento()
  const clientes = await seedClientes()

  // 2. Dependent catalog tables
  const equipos = await seedEquipos(marcas)
  const productos = await seedProductos(marcas, categorias)

  // 3. Relationships
  await seedProductoEquipo(productos, equipos)

  // 4. Stock
  await seedStock(productos, ubicaciones)

  // 5. Transactions
  await seedVentas(clientes, productos, ubicaciones, tiposMov)
  await seedMovimientos(productos, ubicaciones, tiposMov)

  console.log('='.repeat(50))
  console.log('🎉 Seed complete!')
}

// Run directly: bun prisma/seed.ts
seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
