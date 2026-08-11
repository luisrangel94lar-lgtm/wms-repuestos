import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const activities = await db.movimiento.findMany({
      take: 20,
      orderBy: { fecha: 'desc' },
      include: {
        producto: { select: { nombre: true, sku: true } },
        ubicacion: { select: { pasillo: true, estante: true, nivel: true } },
        tipoMovimiento: { select: { nombre: true } },
      },
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Activity feed error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
