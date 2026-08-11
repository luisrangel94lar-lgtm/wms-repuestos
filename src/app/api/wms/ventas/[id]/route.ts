import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const venta = await db.venta.findUnique({
      where: { id: parseInt(id, 10) },
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
