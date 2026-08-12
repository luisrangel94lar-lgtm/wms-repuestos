import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { checkLicenseStatus, getLicenseInfo, activateLicense } from '@/lib/license'
import { z } from 'zod'

const activateSchema = z.object({
  clave: z
    .string()
    .regex(
      /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/,
      'Formato inválido. Use: XXXX-XXXX-XXXX-XXXX'
    ),
})

// GET /api/auth/license — Return current license info
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const [status, info] = await Promise.all([
      checkLicenseStatus(),
      getLicenseInfo(),
    ])

    return NextResponse.json({
      status,
      license: info,
    })
  } catch (error: any) {
    console.error('Error fetching license info:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener información de licencia' },
      { status: 500 }
    )
  }
}

// POST /api/auth/license — Activate a license key (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (session.user.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden activar licencias' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = activateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    await activateLicense(parsed.data.clave)

    // Return updated license info
    const [status, info] = await Promise.all([
      checkLicenseStatus(),
      getLicenseInfo(),
    ])

    return NextResponse.json({
      message: 'Licencia activada correctamente',
      status,
      license: info,
    })
  } catch (error: any) {
    console.error('Error activating license:', error)
    const message =
      error.message === 'Formato de clave inválido. Use: XXXX-XXXX-XXXX-XXXX' ||
      error.message === 'Esta licencia ya está activa.'
        ? error.message
        : 'Error al activar licencia'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
