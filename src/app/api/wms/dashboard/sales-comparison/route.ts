import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantUser, tenantWhere } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const companyFilter = tenantWhere(user, searchParams.get('empresaId'))
    const days = parseInt(searchParams.get('days') || '7', 10)

    const now = new Date()
    const currentStart = new Date(now)
    currentStart.setDate(currentStart.getDate() - days + 1)
    currentStart.setHours(0, 0, 0, 0)

    const previousStart = new Date(currentStart)
    previousStart.setDate(previousStart.getDate() - days)

    // Current period total
    const currentSales = await db.venta.findMany({
      where: {
        fecha: { gte: currentStart, lte: now },
        estado: 'COMPLETADA',
        ...companyFilter,
      },
      select: { total: true },
    })
    const currentTotal = currentSales.reduce((sum, s) => sum + (s.total ?? 0), 0)

    // Previous period total
    const previousSales = await db.venta.findMany({
      where: {
        fecha: { gte: previousStart, lt: currentStart },
        estado: 'COMPLETADA',
        ...companyFilter,
      },
      select: { total: true },
    })
    const previousTotal = previousSales.reduce((sum, s) => sum + (s.total ?? 0), 0)

    // Calculate change percent
    let changePercent = 0
    if (previousTotal > 0) {
      changePercent = ((currentTotal - previousTotal) / previousTotal) * 100
    } else if (currentTotal > 0) {
      changePercent = 100
    }

    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (changePercent > 2) trend = 'up'
    else if (changePercent < -2) trend = 'down'

    return NextResponse.json({
      currentPeriod: currentTotal,
      previousPeriod: previousTotal,
      changePercent: Math.round(changePercent * 10) / 10,
      trend,
    })
  } catch (error) {
    console.error('Sales comparison error:', error)
    return NextResponse.json({ error: 'Error al obtener comparación de ventas' }, { status: 500 })
  }
}
