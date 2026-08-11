import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { idProducto, idEquipo } = await request.json()
    const pe = await db.productoEquipo.create({
      data: { idProducto, idEquipo },
    })
    return NextResponse.json(pe, { status: 201 })
  } catch (error: unknown) {
    console.error('ProductoEquipo POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al agregar compatibilidad'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { idProducto, idEquipo } = await request.json()
    await db.productoEquipo.delete({
      where: { idProducto_idEquipo: { idProducto, idEquipo } },
    })
    return NextResponse.json({ message: 'Compatibilidad eliminada' })
  } catch (error) {
    console.error('ProductoEquipo DELETE error:', error)
    return NextResponse.json({ error: 'Error al eliminar compatibilidad' }, { status: 500 })
  }
}
