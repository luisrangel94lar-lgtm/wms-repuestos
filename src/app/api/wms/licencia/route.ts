import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const licencia = await db.licencia.findFirst({
      orderBy: { fechaCreacion: 'desc' },
    })

    return NextResponse.json(licencia)
  } catch (error) {
    console.error('Get license error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
