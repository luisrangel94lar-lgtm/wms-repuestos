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
