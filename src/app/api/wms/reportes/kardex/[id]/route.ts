import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const productoId = parseInt(id, 10)

    const producto = await db.producto.findUnique({
      where: { id: productoId },
      include: { categoria: true, marca: true },
    })
    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const movimientos = await db.movimiento.findMany({
      where: { idProducto: productoId },
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
