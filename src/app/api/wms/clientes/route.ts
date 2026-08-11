import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { nombre: { contains: search } },
        { telefono: { contains: search } },
      ]
    }

    const clientes = await db.cliente.findMany({
      where,
      orderBy: { nombre: 'asc' },
    })
    return NextResponse.json(clientes)
  } catch (error) {
    console.error('Clientes GET error:', error)
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const cliente = await db.cliente.create({
      data: {
        nombre: body.nombre,
        telefono: body.telefono ?? null,
        email: body.email ?? null,
        tipoCliente: body.tipoCliente ?? 'Tecnico',
      },
    })
    return NextResponse.json(cliente, { status: 201 })
  } catch (error: unknown) {
    console.error('Clientes POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al crear cliente'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
