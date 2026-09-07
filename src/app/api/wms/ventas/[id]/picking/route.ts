import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantUser, tenantWhere } from '@/lib/tenant'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const venta = await db.venta.findFirst({
      where: { id: parseInt(id, 10), ...tenantWhere(user) },
      include: {
        cliente: true,
        detalles: { include: { producto: true } },
      },
    })

    if (!venta) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
    }

    // Build picking list: for each line item, find stock locations sorted by quantity desc
    const pickingItems = await Promise.all(
      venta.detalles.map(async (det) => {
        const stockLocations = await db.stock.findMany({
          where: { idProducto: det.idProducto },
          include: { ubicacion: true },
          orderBy: { cantidad: 'desc' },
        })

        const totalAvailable = stockLocations.reduce((sum, s) => sum + s.cantidad, 0)

        return {
          idProducto: det.idProducto,
          producto: {
            nombre: det.producto.nombre,
            sku: det.producto.sku,
          },
          cantidadNecesaria: det.cantidad,
          cantidadDisponible: totalAvailable,
          suficiente: totalAvailable >= det.cantidad,
          ubicaciones: stockLocations.map((s) => ({
            idUbicacion: s.idUbicacion,
            codigo: `${s.ubicacion.pasillo}-${s.ubicacion.estante}-${s.ubicacion.nivel}`,
            cantidad: s.cantidad,
          })),
        }
      })
    )

    return NextResponse.json({
      folio: venta.folio,
      fecha: venta.fecha,
      estado: venta.estado,
      cliente: {
        id: venta.cliente.id,
        nombre: venta.cliente.nombre,
        telefono: venta.cliente.telefono,
      },
      total: venta.total,
      items: pickingItems,
    })
  } catch (error) {
    console.error('Picking list error:', error)
    return NextResponse.json({ error: 'Error al generar lista de picking' }, { status: 500 })
  }
}
