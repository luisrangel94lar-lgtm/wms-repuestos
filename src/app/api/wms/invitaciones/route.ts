import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const VALID_PLANS = ['trial', 'mensual', 'anual', 'vitalicio'] as const

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.rol !== 'super_admin') {
      return NextResponse.json({ error: 'Solo el superadministrador puede crear invitaciones' }, { status: 403 })
    }

    const { plan } = await request.json()
    if (!VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const token = crypto.randomBytes(18).toString('base64url')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await db.licencia.create({
      data: {
        clave: token,
        tipo: plan,
        estado: 'invitacion',
        fechaVencimiento: expiresAt,
        maxUsuarios: { trial: 3, mensual: 5, anual: 10, vitalicio: 50 }[plan],
        diasPrueba: plan === 'trial' ? 30 : 0,
        notas: `Invitación creada por ${session.user.email ?? session.user.id}`,
      },
    })

    return NextResponse.json({
      url: `${request.nextUrl.origin}/?r=${token}`,
      plan,
      expiresAt: expiresAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('Create company invitation error:', error)
    return NextResponse.json({ error: 'No se pudo crear el enlace de registro' }, { status: 500 })
  }
}

