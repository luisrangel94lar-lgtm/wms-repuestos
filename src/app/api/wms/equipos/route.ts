import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { modelo: { contains: search } },
        { marca: { nombre: { contains: search } } },
      ]
    }

    const equipos = await db.equipo.findMany({
      where,
      include: { marca: true },
      orderBy: { modelo: 'asc' },
    })
    return NextResponse.json(equipos)
  } catch (error) {
    console.error('Equipos GET error:', error)
    return NextResponse.json({ error: 'Error al obtener equipos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const equipo = await db.equipo.create({
      data: {
        idMarca: body.idMarca,
        modelo: body.modelo,
        tipoEquipo: body.tipoEquipo ?? null,
      },
    })
    return NextResponse.json(equipo, { status: 201 })
  } catch (error: unknown) {
    console.error('Equipos POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al crear equipo'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
