import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ authenticated: false, session: null, license: null })
    }

    const user = session.user as any

    // Get license info
    const licencia = await db.licencia.findFirst({
      orderBy: { fechaCreacion: 'desc' },
    })

    let licenseInfo = null
    if (licencia) {
      const now = new Date()
      let expired = false
      if (licencia.estado === 'vencida') {
        expired = true
      } else if (licencia.fechaVencimiento && new Date(licencia.fechaVencimiento) < now) {
        expired = true
      }

      let daysLeft = 0
      if (licencia.fechaVencimiento) {
        const exp = new Date(licencia.fechaVencimiento)
        daysLeft = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      }

      licenseInfo = {
        active: licencia.estado === 'activa' && !expired,
        type: licencia.tipo,
        daysLeft,
        expired,
        fechaVencimiento: licencia.fechaVencimiento,
        maxUsuarios: licencia.maxUsuarios,
      }
    }

    return NextResponse.json({
      authenticated: true,
      session: {
        user: {
          id: user.id,
          nombre: user.name,
          email: user.email,
          rol: user.rol,
        },
        expires: session.expires || new Date(Date.now() + 86400000).toISOString(),
      },
      license: licenseInfo,
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ authenticated: false, session: null, license: null })
  }
}
