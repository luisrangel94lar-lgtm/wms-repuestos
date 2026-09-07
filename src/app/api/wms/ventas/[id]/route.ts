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
    return NextResponse.json(venta)
  } catch (error) {
    console.error('Venta GET error:', error)
    return NextResponse.json({ error: 'Error al obtener venta' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await request.json()
    
    if (body.estado === 'CANCELADA') {
      // Find the sale with details
      const venta = await db.venta.findFirst({
        where: { id: parseInt(id, 10), ...tenantWhere(user) },
        include: { detalles: true },
      })
      if (!venta) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
      
      await db.$transaction(async (tx) => {
        // Create DEVOLUCION movements and restore stock for each detail
        for (const det of venta.detalles) {
          await tx.movimiento.create({
            data: {
              empresaId: venta.empresaId,
              idProducto: det.idProducto,
              idTipo: 5, // DEVOLUCION
              cantidad: det.cantidad,
              referencia: `Devolución por cancelación venta ${venta.folio}`,
              observacion: 'Cancelación de venta',
            },
          })
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
            // Get first location
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
          where: { id: parseInt(id, 10) },
          data: { estado: 'CANCELADA' },
        })
      })
      
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 })
  } catch (error: unknown) {
    console.error('Venta PATCH error:', error)
    const msg = error instanceof Error ? error.message : 'Error al actualizar venta'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
