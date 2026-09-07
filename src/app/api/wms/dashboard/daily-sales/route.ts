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
    const days = parseInt(searchParams.get('days') ?? '7', 10)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const sales = await db.venta.findMany({
      where: { fecha: { gte: startDate }, ...tenantWhere(user, searchParams.get('empresaId')) },
      include: { detalles: { include: { producto: { select: { id: true, nombre: true, precioVenta: true } } } } },
      orderBy: { fecha: 'asc' },
    })

    // Group by day
    const dayMap = new Map<string, { date: string; total: number; count: number }>()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dayMap.set(key, { date: key, total: 0, count: 0 })
    }

    for (const sale of sales) {
      const day = sale.fecha.toISOString().split('T')[0]
      const entry = dayMap.get(day)
      if (entry) {
        entry.total += sale.total ?? 0
        entry.count += 1
      }
    }

    const daily = Array.from(dayMap.values()).map(d => ({
      name: new Date(d.date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      ventas: Math.round(d.total),
      count: d.count,
    }))

    return NextResponse.json(daily)
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
