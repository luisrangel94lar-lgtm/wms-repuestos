import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    // Total stock value
    const stocks = await db.stock.findMany({
      include: { producto: { select: { costoUnitario: true } } },
    })
    const valorTotalStock = stocks.reduce(
      (sum, s) => sum + s.cantidad * s.producto.costoUnitario,
      0
    )

    // Products below minimum stock
    const productosBajoStockRaw = await db.producto.findMany({
      where: { activo: true },
      include: { stocks: true, categoria: true, marca: true },
    })
    const productosBajoStock = productosBajoStockRaw
      .map((p) => ({
        ...p,
        totalStock: p.stocks.reduce((sum, s) => sum + s.cantidad, 0),
      }))
      .filter((p) => p.totalStock < p.stockMinimo)

    // Sales counts
    const ventas = await db.venta.findMany({
      where: { fecha: { gte: monthStart } },
    })
    const ventasHoy = ventas.filter((v) => v.fecha >= today)
    const ventasSemana = ventas.filter((v) => v.fecha >= weekStart)

    // Movements today
    const movimientosHoy = await db.movimiento.count({
      where: { fecha: { gte: today } },
    })

    // Totals
    const totalProductos = await db.producto.count()
    const totalClientes = await db.cliente.count()

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
