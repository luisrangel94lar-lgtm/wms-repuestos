import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cliente = await db.cliente.findUnique({
      where: { id: parseInt(id, 10) },
      include: { ventas: { include: { detalles: { include: { producto: true } } }, orderBy: { fecha: 'desc' } } },
    })
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }
    return NextResponse.json(cliente)
  } catch (error) {
    console.error('Cliente GET error:', error)
    return NextResponse.json({ error: 'Error al obtener cliente' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const cliente = await db.cliente.update({
      where: { id: parseInt(id, 10) },
      data: {
        nombre: body.nombre,
        telefono: body.telefono ?? null,
        email: body.email ?? null,
        tipoCliente: body.tipoCliente ?? 'Tecnico',
      },
    })
    return NextResponse.json(cliente)
  } catch (error: unknown) {
    console.error('Cliente PUT error:', error)
    const msg = error instanceof Error ? error.message : 'Error al actualizar cliente'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.cliente.delete({ where: { id: parseInt(id, 10) } })
    return NextResponse.json({ message: 'Cliente eliminado' })
  } catch (error) {
    console.error('Cliente DELETE error:', error)
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 })
  }
}
