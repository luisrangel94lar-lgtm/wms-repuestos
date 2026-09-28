import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getTenantUser, tenantWhere } from '@/lib/tenant'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getTenantUser(await getServerSession(authOptions))
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const sale = await db.venta.findFirst({
    where: { id: Number(id), ...tenantWhere(user) },
    include: { pagos: { orderBy: { fechaCreacion: 'desc' }, take: 1 } },
  })
  if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
  const payment = sale.pagos[0]
  return NextResponse.json({
    ventaId: sale.id,
    ventaEstado: sale.estado,
    pago: payment ? {
      id: payment.id,
      estado: payment.estado,
      estadoProveedor: payment.estadoProveedor,
      referencia: payment.referencia,
      checkoutUrl: payment.checkoutUrl,
    } : null,
  })
}
