import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantUser, tenantWhere } from '@/lib/tenant'

export async function GET() {
  try {
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const companyFilter = tenantWhere(user)
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)
    const fourteenDaysAgo = new Date(sevenDaysAgo)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 7)

    // Stock value: compare sum of (stock.cantidad * producto.precioVenta) across periods
    // We use a simplified approach: sum current product costs (since stock values don't change by period)
    // Instead, compare number of stock entries created in each period via movements

    // Sales trend: last 7 days vs previous 7 days
    const currentSales = await db.venta.findMany({
      where: { fecha: { gte: sevenDaysAgo, lte: now }, estado: 'COMPLETADA', ...companyFilter },
      select: { total: true },
    })
    const currentSalesTotal = currentSales.reduce((sum, s) => sum + (s.total ?? 0), 0)

    const previousSales = await db.venta.findMany({
      where: { fecha: { gte: fourteenDaysAgo, lt: sevenDaysAgo }, estado: 'COMPLETADA', ...companyFilter },
      select: { total: true },
    })
    const previousSalesTotal = previousSales.reduce((sum, s) => sum + (s.total ?? 0), 0)

    // Movements trend: count in each period
    const currentMovements = await db.movimiento.count({
      where: { fecha: { gte: sevenDaysAgo, lte: now }, ...companyFilter },
    })
    const previousMovements = await db.movimiento.count({
      where: { fecha: { gte: fourteenDaysAgo, lt: sevenDaysAgo }, ...companyFilter },
    })

    // Stock value trend: approximate by comparing ENTRADA movement value
    // current period entries vs previous period entries
    const tipoEntrada = await db.tipoMovimiento.findFirst({ where: { nombre: 'ENTRADA' } })
    const currentEntries = tipoEntrada
      ? await db.movimiento.findMany({
          where: { fecha: { gte: sevenDaysAgo, lte: now }, idTipo: tipoEntrada.id, ...companyFilter },
          select: { cantidad: true, costoUnitario: true },
        })
      : []
    const currentEntryValue = currentEntries.reduce(
      (sum, m) => sum + m.cantidad * (m.costoUnitario ?? 0),
      0
    )

    const previousEntries = tipoEntrada
      ? await db.movimiento.findMany({
          where: { fecha: { gte: fourteenDaysAgo, lt: sevenDaysAgo }, idTipo: tipoEntrada.id, ...companyFilter },
          select: { cantidad: true, costoUnitario: true },
        })
      : []
    const previousEntryValue = previousEntries.reduce(
      (sum, m) => sum + m.cantidad * (m.costoUnitario ?? 0),
      0
    )

    function calcTrend(current: number, previous: number): number {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 1000) / 10
    }

    return NextResponse.json({
      stockTrend: calcTrend(currentEntryValue, previousEntryValue),
      salesTrend: calcTrend(currentSalesTotal, previousSalesTotal),
      movementsTrend: calcTrend(currentMovements, previousMovements),
    })
  } catch (error) {
    console.error('KPI trends error:', error)
    return NextResponse.json({ error: 'Error al obtener tendencias' }, { status: 500 })
  }
}
