import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'super_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { clave } = await req.json()
    const currentUser = session.user as any

    if (!clave || typeof clave !== 'string' || clave.trim().length < 8) {
      return NextResponse.json({ error: 'Clave de licencia inválida' }, { status: 400 })
    }

    // Check if key is already used or find it
    const normalizedKey = clave.trim().toUpperCase()
    const existing = await db.licencia.findFirst({
      where: { clave: normalizedKey },
    })

    if (existing) {
      if (currentUser.rol !== 'super_admin' && existing.empresaId !== currentUser.empresaId) {
        return NextResponse.json({ error: 'Esta licencia pertenece a otra empresa' }, { status: 403 })
      }
      if (existing.estado === 'activa') {
        return NextResponse.json({ error: 'Esta licencia ya está activa' }, { status: 400 })
      }
      if (!['pendiente', 'vencida'].includes(existing.estado)) {
        return NextResponse.json({ error: 'La licencia no puede activarse' }, { status: 400 })
      }
      // Reactivate
      const now = new Date()
      let fechaVencimiento: Date | null = null
      if (existing.tipo === 'mensual') {
        fechaVencimiento = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      } else if (existing.tipo === 'anual') {
        fechaVencimiento = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      }
      // vitalicio has no expiration

      const updated = await db.licencia.update({
        where: { id: existing.id },
        data: {
          estado: 'activa',
          fechaActivacion: now,
          fechaVencimiento,
        },
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Clave de licencia no válida' }, { status: 404 })
  } catch (error) {
    console.error('Activate license error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
