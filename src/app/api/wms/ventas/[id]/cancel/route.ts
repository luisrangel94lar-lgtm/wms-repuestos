import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantUser, tenantWhere } from '@/lib/tenant'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ventaId = parseInt(id, 10)
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const venta = await db.venta.findFirst({
      where: { id: ventaId, ...tenantWhere(user) },
      include: { detalles: true },
    })
    if (!venta) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
    }
    if (venta.estado === 'CANCELADA') {
      return NextResponse.json({ error: 'La venta ya está cancelada' }, { status: 400 })
    }

    // Find DEVOLUCION movement type
    const tipoDevolucion = await db.tipoMovimiento.findFirst({
      where: { nombre: 'DEVOLUCION' },
    })
    if (!tipoDevolucion) {
      return NextResponse.json({ error: 'Tipo de movimiento DEVOLUCION no encontrado' }, { status: 500 })
    }

    let movementsCreated = 0
    let totalUnits = 0

    await db.$transaction(async (tx) => {
      for (const det of venta.detalles) {
        // Create DEVOLUCION movement
        await tx.movimiento.create({
          data: {
            empresaId: venta.empresaId,
            idProducto: det.idProducto,
            idTipo: tipoDevolucion.id,
            cantidad: det.cantidad,
            referencia: `Cancelación venta ${venta.folio}`,
            observacion: 'Devolución de stock por cancelación de venta',
          },
        })
        movementsCreated++
        totalUnits += det.cantidad

        // Restore stock at first available location
        const existingStock = await tx.stock.findFirst({
          where: { idProducto: det.idProducto },
        })
        if (existingStock) {
          await tx.stock.update({
            where: { idProducto_idUbicacion: { idProducto: det.idProducto, idUbicacion: existingStock.idUbicacion } },
            data: { cantidad: existingStock.cantidad + det.cantidad },
          })
        } else {
          const firstLoc = await tx.ubicacion.findFirst({ where: { activo: true } })
          if (firstLoc) {
            await tx.stock.create({
              data: { idProducto: det.idProducto, idUbicacion: firstLoc.id, cantidad: det.cantidad },
            })
          }
        }
      }
      // Update sale status
      await tx.venta.update({
        where: { id: ventaId },
        data: { estado: 'CANCELADA' },
      })
    })

    return NextResponse.json({
      success: true,
      message: `Venta cancelada. ${totalUnits} unidades devueltas al inventario`,
      movementsCreated,
    })
  } catch (error: unknown) {
    console.error('Cancel sale error:', error)
    const msg = error instanceof Error ? error.message : 'Error al cancelar venta'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
