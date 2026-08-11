import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const equipo = await db.equipo.findUnique({
      where: { id: parseInt(id, 10) },
      include: { marca: true, productoEquipo: { include: { producto: true } } },
    })
    if (!equipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }
    return NextResponse.json(equipo)
  } catch (error) {
    console.error('Equipo GET error:', error)
    return NextResponse.json({ error: 'Error al obtener equipo' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const equipo = await db.equipo.update({
      where: { id: parseInt(id, 10) },
      data: {
        idMarca: body.idMarca,
        modelo: body.modelo,
        tipoEquipo: body.tipoEquipo ?? null,
      },
    })
    return NextResponse.json(equipo)
  } catch (error: unknown) {
    console.error('Equipo PUT error:', error)
    const msg = error instanceof Error ? error.message : 'Error al actualizar equipo'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.equipo.delete({ where: { id: parseInt(id, 10) } })
    return NextResponse.json({ message: 'Equipo eliminado' })
  } catch (error) {
    console.error('Equipo DELETE error:', error)
    return NextResponse.json({ error: 'Error al eliminar equipo' }, { status: 500 })
  }
}
