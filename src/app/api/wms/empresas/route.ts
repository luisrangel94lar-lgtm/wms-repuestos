import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = session.user as any
    if (user.rol !== 'super_admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const empresas = await db.empresa.findMany({
      include: {
        _count: {
          select: {
            usuarios: true,
            almacenes: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json(empresas)
  } catch (error) {
    console.error('Empresas GET error:', error)
    return NextResponse.json({ error: 'Error al obtener empresas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = session.user as any
    if (user.rol !== 'super_admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, nit, direccion, telefono, email, logo, plan } = body

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    const empresa = await db.empresa.create({
      data: {
        nombre,
        nit: nit ?? null,
        direccion: direccion ?? null,
        telefono: telefono ?? null,
        email: email ?? null,
        logo: logo ?? null,
        plan: plan ?? 'mensual',
      },
    })

    return NextResponse.json(empresa, { status: 201 })
  } catch (error: unknown) {
    console.error('Empresas POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al crear empresa'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
