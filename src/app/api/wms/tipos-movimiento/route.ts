import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const tipos = await db.tipoMovimiento.findMany({ orderBy: { nombre: 'asc' } })
    return NextResponse.json(tipos)
  } catch (error) {
    console.error('TiposMovimiento GET error:', error)
    return NextResponse.json({ error: 'Error al obtener tipos de movimiento' }, { status: 500 })
  }
}
