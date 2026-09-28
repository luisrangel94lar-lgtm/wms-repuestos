import type { Prisma } from '@prisma/client'

export async function finalizePaidSale(tx: Prisma.TransactionClient, paymentId: number, transactionId: string, providerStatus: string) {
  const payment = await tx.pago.findUnique({
    where: { id: paymentId },
    include: { venta: { include: { detalles: true } } },
  })
  if (!payment) throw new Error('Pago no encontrado')
  if (payment.estado === 'APROBADO' && payment.venta.estado === 'COMPLETADA') return payment.venta
  if (payment.venta.estado !== 'PENDIENTE_PAGO') throw new Error('La venta no está pendiente de pago')

  const tipoSalida = await tx.tipoMovimiento.findFirst({ where: { nombre: 'SALIDA' } })
  if (!tipoSalida) throw new Error('No existe el tipo de movimiento SALIDA')

  for (const detail of payment.venta.detalles) {
    let remaining = detail.cantidad
    const entries = await tx.stock.findMany({
      where: {
        idProducto: detail.idProducto,
        cantidad: { gt: 0 },
        ubicacion: payment.venta.almacenId ? { almacenId: payment.venta.almacenId } : undefined,
      },
      orderBy: { cantidad: 'desc' },
    })
    if (entries.reduce((sum, item) => sum + item.cantidad, 0) < remaining) {
      throw new Error(`Stock insuficiente para completar la venta ${payment.venta.folio}`)
    }
    for (const entry of entries) {
      if (remaining <= 0) break
      const quantity = Math.min(entry.cantidad, remaining)
      const updated = await tx.stock.updateMany({
        where: { idProducto: entry.idProducto, idUbicacion: entry.idUbicacion, cantidad: { gte: quantity } },
        data: { cantidad: { decrement: quantity } },
      })
      if (updated.count !== 1) throw new Error('El inventario cambió mientras se confirmaba el pago')
      await tx.movimiento.create({
        data: {
          empresaId: payment.empresaId,
          idProducto: detail.idProducto,
          idUbicacion: entry.idUbicacion,
          idTipo: tipoSalida.id,
          cantidad: quantity,
          referencia: payment.venta.folio,
          observacion: `Pago Wompi ${transactionId}`,
          almacenId: payment.venta.almacenId,
        },
      })
      remaining -= quantity
    }
  }

  await tx.pago.update({
    where: { id: payment.id },
    data: { estado: 'APROBADO', estadoProveedor: providerStatus, transaccionId: transactionId, fechaAprobacion: new Date() },
  })
  return tx.venta.update({ where: { id: payment.ventaId }, data: { estado: 'COMPLETADA' } })
}
