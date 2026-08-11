import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    const ventaWhere: Record<string, unknown> = { estado: 'COMPLETADA' }
    if (fechaDesde || fechaHasta) {
      ventaWhere.fecha = {}
      if (fechaDesde) (ventaWhere.fecha as Record<string, unknown>).gte = new Date(fechaDesde)
      if (fechaHasta) (ventaWhere.fecha as Record<string, unknown>).lte = new Date(fechaHasta)
    }

    // Get all completed sale details
    const ventas = await db.venta.findMany({
      where: ventaWhere,
      include: { detalles: true },
    })

    // Get all product-equipment compatibilities
    const compatibilidades = await db.productoEquipo.findMany({
      include: { equipo: { include: { marca: true } }, producto: true },
    })

    // Map product -> compatible equipment
    const productoEquipos = new Map<number, typeof compatibilidades[number]>()
    for (const c of compatibilidades) {
      if (!productoEquipos.has(c.idProducto)) {
        productoEquipos.set(c.idProducto, c)
      }
    }

    // Aggregate demand per equipment
    const demanda = new Map<number, {
      equipo: typeof compatibilidades[number]['equipo']
      cantidadTotal: number
      productos: string[]
    }>()

    for (const v of ventas) {
      for (const d of v.detalles) {
        const compat = productoEquipos.get(d.idProducto)
        if (compat) {
          const existing = demanda.get(compat.idEquipo)
          if (existing) {
            existing.cantidadTotal += d.cantidad
            if (!existing.productos.includes(compat.producto.nombre)) {
              existing.productos.push(compat.producto.nombre)
            }
          } else {
            demanda.set(compat.idEquipo, {
              equipo: compat.equipo,
              cantidadTotal: d.cantidad,
              productos: [compat.producto.nombre],
            })
          }
        }
      }
    }

    return NextResponse.json(
      Array.from(demanda.values()).sort((a, b) => b.cantidadTotal - a.cantidadTotal)
    )
  } catch (error) {
    console.error('DemandaPorEquipo GET error:', error)
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 })
  }
}
