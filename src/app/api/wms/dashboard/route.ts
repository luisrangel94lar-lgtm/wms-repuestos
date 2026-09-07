import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantUser, tenantWhere } from '@/lib/tenant'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = getTenantUser(session)!
    const companyFilter = tenantWhere(user)

    // Build filtered where clauses based on role
    // super_admin: no filter (sees everything globally)
    // admin: filter by their empresaId (through almacen)
    // gerente/vendedor/tecnico: filter by their almacenId
    const almacenFilter: Record<string, unknown> = {}
    if (['gerente', 'cajero', 'vendedor', 'tecnico'].includes(user.rol) && user.almacenId) {
      almacenFilter.id = user.almacenId
    } else if (user.rol === 'admin' && user.empresaId) {
      almacenFilter.empresaId = user.empresaId
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    // Total stock value
    const stockWhere: Record<string, unknown> = {}
    if (Object.keys(almacenFilter).length > 0) {
      stockWhere.ubicacion = { almacen: almacenFilter }
    }
    const stocks = await db.stock.findMany({
      where: stockWhere,
      include: { producto: { select: { costoUnitario: true } } },
    })
    const valorTotalStock = stocks.reduce(
      (sum, s) => sum + s.cantidad * s.producto.costoUnitario,
      0
    )

    // Products below minimum stock (products are global, no filtering)
    const productosBajoStockRaw = await db.producto.findMany({
      where: { activo: true, ...companyFilter },
      include: { stocks: true, categoria: true, marca: true },
    })
    const productosBajoStock = productosBajoStockRaw
      .map((p) => ({
        ...p,
        totalStock: p.stocks.reduce((sum, s) => sum + s.cantidad, 0),
      }))
      .filter((p) => p.totalStock < p.stockMinimo)

    // Sales counts (filtered by role)
    const ventasWhere: Record<string, unknown> = { fecha: { gte: monthStart }, ...companyFilter }
    if (Object.keys(almacenFilter).length > 0) {
      ventasWhere.almacen = almacenFilter
    }
    const ventas = await db.venta.findMany({ where: ventasWhere })
    const ventasHoy = ventas.filter((v) => v.fecha >= today)
    const ventasSemana = ventas.filter((v) => v.fecha >= weekStart)

    // Movements today (filtered by role)
    const movWhere: Record<string, unknown> = { fecha: { gte: today }, ...companyFilter }
    if (Object.keys(almacenFilter).length > 0) {
      movWhere.almacen = almacenFilter
    }
    const movimientosHoy = await db.movimiento.count({ where: movWhere })

    // Totals (products and clients are global)
    const totalProductos = await db.producto.count({ where: companyFilter })
    const totalClientes = await db.cliente.count({ where: companyFilter })

    return NextResponse.json({
      valorTotalStock,
      productosBajoStock: {
        count: productosBajoStock.length,
        items: productosBajoStock,
      },
      ventasHoy: {
        count: ventasHoy.length,
        total: ventasHoy.reduce((s, v) => s + (v.total ?? 0), 0),
      },
      ventasSemana: {
        count: ventasSemana.length,
        total: ventasSemana.reduce((s, v) => s + (v.total ?? 0), 0),
      },
      ventasMes: {
        count: ventas.length,
        total: ventas.reduce((s, v) => s + (v.total ?? 0), 0),
      },
      movimientosHoy,
      totalProductos,
      totalClientes,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos del dashboard' },
      { status: 500 }
    )
  }
}
