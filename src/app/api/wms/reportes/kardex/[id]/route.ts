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
    const productoId = parseInt(id, 10)
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const producto = await db.producto.findFirst({
      where: { id: productoId, ...tenantWhere(user) },
      include: { categoria: true, marca: true },
    })
    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const movimientos = await db.movimiento.findMany({
      where: { idProducto: productoId, ...tenantWhere(user) },
      include: { tipoMovimiento: true, ubicacion: true },
      orderBy: { fecha: 'asc' },
    })

    // Calculate running balance
    let balance = 0
    const kardex = movimientos.map((m) => {
      if (m.tipoMovimiento.nombre === 'ENTRADA') {
        balance += m.cantidad
      } else if (m.tipoMovimiento.nombre === 'SALIDA') {
        balance -= m.cantidad
      } else if (m.tipoMovimiento.nombre === 'AJUSTE') {
        // For AJUSTE, the cantidad in the movement represents the new absolute value
        // We need to look at the stock state, but for kardex we treat it as a delta
        // Actually for kardex display, AJUSTE sets the balance directly
        balance = m.cantidad
      }
      return {
        ...m,
        saldo: balance,
      }
    })

    return NextResponse.json({ producto, kardex })
  } catch (error) {
    console.error('Kardex GET error:', error)
    return NextResponse.json({ error: 'Error al generar kardex' }, { status: 500 })
  }
}
