import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const productoId = parseInt(id, 10)
    if (isNaN(productoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Get all movements for this product, ordered by date ascending
    const movimientos = await db.movimiento.findMany({
      where: { idProducto: productoId },
      include: { tipoMovimiento: { select: { nombre: true } } },
      orderBy: { fecha: 'asc' },
    })

    // Get current total stock across all locations
    const currentStock = await db.stock.findMany({
      where: { idProducto: productoId },
    })
    const totalCurrent = currentStock.reduce((s, st) => s + st.cantidad, 0)

    // Calculate running balance backwards
    // Start from current total and subtract each movement's effect
    const timeline: { fecha: string; balance: number; tipo: string; cantidad: number }[] = []
    let balance = totalCurrent

    // Work backwards to reconstruct historical balance
    for (let i = movimientos.length - 1; i >= 0; i--) {
      const mov = movimientos[i]
      timeline.unshift({
        fecha: mov.fecha.toISOString(),
        balance,
        tipo: mov.tipoMovimiento.nombre,
        cantidad: mov.cantidad,
      })
      // Reverse the movement effect to get previous balance
      if (mov.tipoMovimiento.nombre === 'ENTRADA') {
        balance -= mov.cantidad
      } else if (mov.tipoMovimiento.nombre === 'SALIDA') {
        balance += mov.cantidad
      }
      // AJUSTE: the current balance was set by the last AJUSTE, so we can't easily reverse
      // We'll set balance to 0 before the first AJUSTE we encounter going backwards
      if (mov.tipoMovimiento.nombre === 'AJUSTE') {
        balance = mov.cantidad
      }
    }

    // Add an initial point at the beginning
    if (timeline.length > 0) {
      timeline.unshift({
        fecha: new Date(timeline[0].fecha).toISOString(),
        balance,
        tipo: 'INICIAL',
        cantidad: 0,
      })
    }

    // Return last 30 points
    const result = timeline.slice(-30)

    return NextResponse.json({
      productoId,
      currentStock: totalCurrent,
      timeline: result.map((t) => ({
        date: t.fecha,
        balance: t.balance,
        tipo: t.tipo,
      })),
    })
  } catch (error) {
    console.error('Product timeline GET error:', error)
    return NextResponse.json({ error: 'Error al obtener timeline' }, { status: 500 })
  }
}
