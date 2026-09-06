import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hashPassword } from '@/lib/auth-helpers'

// POST /api/wms/reset-admin — super_admin only recovery action.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user.rol !== 'super_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
    if (!email || newPassword.length < 12) {
      return NextResponse.json(
        { error: 'Se requieren email y una contraseña de al menos 12 caracteres' },
        { status: 400 },
      )
    }

    const admin = await db.usuario.findUnique({ where: { email } })
    if (!admin || !['admin', 'super_admin'].includes(admin.rol)) {
      return NextResponse.json({ error: 'Administrador no encontrado' }, { status: 404 })
    }

    await db.usuario.update({
      where: { id: admin.id },
      data: { password: hashPassword(newPassword) },
    })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
