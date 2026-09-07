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
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    const ventaWhere: Record<string, unknown> = { estado: 'COMPLETADA', ...tenantWhere(user, searchParams.get('empresaId')) }
    if (fechaDesde || fechaHasta) {
      ventaWhere.fecha = {}
      if (fechaDesde) (ventaWhere.fecha as Record<string, unknown>).gte = new Date(fechaDesde)
      if (fechaHasta) (ventaWhere.fecha as Record<string, unknown>).lte = new Date(fechaHasta)
    }

    const ventas = await db.venta.findMany({
      where: ventaWhere,
      include: {
        cliente: true,
        detalles: { include: { producto: true } },
      },
    })

    const grouped = new Map<number, {
      cliente: typeof ventas[0]['cliente']
      totalVentas: number
      totalProductos: number
      totalValor: number
    }>()

    for (const v of ventas) {
      const existing = grouped.get(v.idCliente)
      const productosCount = v.detalles.reduce((sum, d) => sum + d.cantidad, 0)
      if (existing) {
        existing.totalVentas += 1
        existing.totalProductos += productosCount
        existing.totalValor += v.total ?? 0
      } else {
        grouped.set(v.idCliente, {
          cliente: v.cliente,
          totalVentas: 1,
          totalProductos: productosCount,
          totalValor: v.total ?? 0,
        })
      }
    }

    return NextResponse.json(Array.from(grouped.values()).sort((a, b) => b.totalValor - a.totalValor))
  } catch (error) {
    console.error('VentasPorCliente GET error:', error)
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 })
  }
}
