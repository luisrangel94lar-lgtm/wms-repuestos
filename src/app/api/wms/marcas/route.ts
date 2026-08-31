import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const marcas = await db.marca.findMany({ orderBy: { nombre: 'asc' } })
    return NextResponse.json(marcas)
  } catch (error) {
    console.error('Marcas GET error:', error)
    return NextResponse.json({ error: 'Error fetching brands' }, { status: 500 })
  }
}
