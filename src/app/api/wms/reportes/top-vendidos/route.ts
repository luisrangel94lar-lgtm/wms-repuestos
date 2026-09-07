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
    const limit = parseInt(searchParams.get('limit') ?? '10', 10)
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    // Build venta filter
    const ventaWhere: Record<string, unknown> = { estado: 'COMPLETADA', ...tenantWhere(user, searchParams.get('empresaId')) }
    if (fechaDesde || fechaHasta) {
      ventaWhere.fecha = {}
      if (fechaDesde) (ventaWhere.fecha as Record<string, unknown>).gte = new Date(fechaDesde)
      if (fechaHasta) (ventaWhere.fecha as Record<string, unknown>).lte = new Date(fechaHasta)
    }

    const ventas = await db.venta.findMany({
      where: ventaWhere,
      include: {
        detalles: {
          include: { producto: { include: { categoria: true, marca: true } } },
        },
      },
    })

    const grouped = new Map<number, {
      producto: typeof ventas[0]['detalles'][0]['producto']
      cantidadVendida: number
      valorTotal: number
    }>()

    for (const v of ventas) {
      for (const d of v.detalles) {
        const existing = grouped.get(d.idProducto)
        if (existing) {
          existing.cantidadVendida += d.cantidad
          existing.valorTotal += d.cantidad * d.precioUnitario
        } else {
          grouped.set(d.idProducto, {
            producto: d.producto,
            cantidadVendida: d.cantidad,
            valorTotal: d.cantidad * d.precioUnitario,
          })
        }
      }
    }

    const sorted = Array.from(grouped.values())
      .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
      .slice(0, limit)
      .map((item) => ({
        producto: item.producto,
        cantidadVendida: item.cantidadVendida,
        valorTotal: item.valorTotal,
      }))

    return NextResponse.json(sorted)
  } catch (error) {
    console.error('TopVendidos GET error:', error)
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 })
  }
}
