import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activos = searchParams.get('activos')

    const where: Record<string, unknown> = {}
    if (activos === 'true') where.activo = true

    const ubicaciones = await db.ubicacion.findMany({
      where,
      orderBy: [{ pasillo: 'asc' }, { estante: 'asc' }, { nivel: 'asc' }],
    })
    return NextResponse.json(ubicaciones)
  } catch (error) {
    console.error('Ubicaciones GET error:', error)
    return NextResponse.json({ error: 'Error al obtener ubicaciones' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const ubicacion = await db.ubicacion.create({
      data: {
        pasillo: body.pasillo,
        estante: body.estante,
        nivel: body.nivel,
        activo: body.activo ?? true,
      },
    })
    return NextResponse.json(ubicacion, { status: 201 })
  } catch (error: unknown) {
    console.error('Ubicaciones POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al crear ubicación'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, pasillo, estante, nivel, activo } = await request.json()

    const ubicacion = await db.ubicacion.update({
      where: { id },
      data: { pasillo, estante, nivel, activo },
    })

    return NextResponse.json(ubicacion)
  } catch (error: unknown) {
    console.error('Ubicaciones PUT error:', error)
    const msg = error instanceof Error ? error.message : 'Error al actualizar ubicación'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id')!, 10)

    if (!id) {
      return NextResponse.json({ error: 'ID de ubicación es requerido' }, { status: 400 })
    }

    const stockEntries = await db.stock.findMany({
      where: { idUbicacion: id },
    })

    if (stockEntries.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar la ubicación porque tiene registros de stock asociados' },
        { status: 400 },
      )
    }

    const ubicacion = await db.ubicacion.update({
      where: { id },
      data: { activo: false },
    })

    return NextResponse.json({ message: 'Ubicación desactivada correctamente', ubicacion })
  } catch (error: unknown) {
    console.error('Ubicaciones DELETE error:', error)
    const msg = error instanceof Error ? error.message : 'Error al eliminar ubicación'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
