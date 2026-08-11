import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const categorias = await db.categoria.findMany({
      orderBy: { nombre: 'asc' },
    })
    return NextResponse.json(categorias)
  } catch (error) {
    console.error('Categorias GET error:', error)
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 })
  }
}
