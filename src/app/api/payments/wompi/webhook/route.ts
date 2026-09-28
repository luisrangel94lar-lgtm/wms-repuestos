import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { fetchWompiTransaction, getWompiConfig, validateEventSignature } from '@/lib/wompi'
import { finalizePaidSale } from '@/lib/finalize-sale'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (body.event !== 'transaction.updated') return NextResponse.json({ received: true })
    const eventTransaction = body.data?.transaction
    if (!eventTransaction?.reference || !eventTransaction?.id) return NextResponse.json({ error: 'Evento inválido' }, { status: 400 })

    const payment = await db.pago.findUnique({
      where: { referencia: eventTransaction.reference },
      include: { empresa: true },
    })
    if (!payment) return NextResponse.json({ received: true })
    const config = getWompiConfig(payment.empresa)
    if (!validateEventSignature(body, config.eventsSecret)) return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })

    const transaction = await fetchWompiTransaction(String(eventTransaction.id), config.privateKey, config.sandbox)
    if (transaction.reference !== payment.referencia || transaction.amount_in_cents !== payment.montoCentavos || transaction.currency !== payment.moneda) {
      return NextResponse.json({ error: 'La transacción no coincide con el pago' }, { status: 409 })
    }

    if (transaction.status === 'APPROVED') {
      try {
        await db.$transaction(
          (tx) => finalizePaidSale(tx, payment.id, transaction.id, transaction.status),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        )
      } catch (error) {
        console.error('Wompi payment approved but sale finalization failed:', error)
        await db.pago.update({
          where: { id: payment.id },
          data: { estado: 'REQUIERE_REVISION', estadoProveedor: transaction.status, transaccionId: transaction.id },
        })
      }
    } else {
      const state = transaction.status === 'PENDING' ? 'PENDIENTE' : transaction.status
      await db.pago.update({
        where: { id: payment.id },
        data: { estado: state, estadoProveedor: transaction.status, transaccionId: transaction.id },
      })
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Wompi webhook error:', error)
    return NextResponse.json({ error: 'No se pudo procesar el evento' }, { status: 500 })
  }
}
