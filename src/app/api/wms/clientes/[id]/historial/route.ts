import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantUser, tenantWhere } from '@/lib/tenant'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const clienteId = parseInt(id, 10)
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (isNaN(clienteId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const cliente = await db.cliente.findFirst({
      where: { id: clienteId, ...tenantWhere(user) },
      select: { id: true, nombre: true, telefono: true, email: true },
    })

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const ventas = await db.venta.findMany({
      where: { idCliente: clienteId, ...tenantWhere(user) },
      include: {
        detalles: {
          include: {
            producto: { select: { id: true, sku: true, nombre: true } },
          },
          orderBy: { idProducto: 'asc' },
        },
      },
      orderBy: { fecha: 'desc' },
    })

    const totalCompras = ventas.length
    const montoTotal = ventas.reduce((sum, v) => sum + (v.total ?? 0), 0)
    const ultimaCompra = ventas.length > 0 ? ventas[0].fecha : null

    return NextResponse.json({
      cliente,
      ventas,
      resumen: {
        totalCompras,
        montoTotal,
        ultimaCompra,
      },
    })
  } catch (error) {
    console.error('Cliente historial GET error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 })
  }
}
