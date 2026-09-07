import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantUser, tenantWhere } from '@/lib/tenant'

export async function GET() {
  try {
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const activities = await db.movimiento.findMany({
      where: tenantWhere(user),
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
