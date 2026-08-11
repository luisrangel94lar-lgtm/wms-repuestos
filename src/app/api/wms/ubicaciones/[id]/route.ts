import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ubicacion = await db.ubicacion.findUnique({
      where: { id: parseInt(id, 10) },
      include: { stocks: { include: { producto: true } } },
    })
    if (!ubicacion) {
      return NextResponse.json({ error: 'Ubicación no encontrada' }, { status: 404 })
    }
    return NextResponse.json(ubicacion)
  } catch (error) {
    console.error('Ubicación GET error:', error)
    return NextResponse.json({ error: 'Error al obtener ubicación' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const ubicacion = await db.ubicacion.update({
      where: { id: parseInt(id, 10) },
      data: {
        pasillo: body.pasillo,
        estante: body.estante,
        nivel: body.nivel,
        activo: body.activo,
      },
    })
    return NextResponse.json(ubicacion)
  } catch (error: unknown) {
    console.error('Ubicación PUT error:', error)
    const msg = error instanceof Error ? error.message : 'Error al actualizar ubicación'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.ubicacion.delete({ where: { id: parseInt(id, 10) } })
    return NextResponse.json({ message: 'Ubicación eliminada' })
  } catch (error) {
    console.error('Ubicación DELETE error:', error)
    return NextResponse.json({ error: 'Error al eliminar ubicación' }, { status: 500 })
  }
}
