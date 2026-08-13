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

    const where: Record<string, unknown> = {}
    if (user.rol === 'admin' && user.empresaId) {
      where.empresaId = user.empresaId
    }
    if (['gerente', 'vendedor', 'tecnico'].includes(user.rol) && user.almacenId) {
      where.id = user.almacenId
    }

    const almacenes = await db.almacen.findMany({
      where,
      include: {
        empresa: { select: { id: true, nombre: true } },
        _count: {
          select: {
            usuarios: true,
            ubicaciones: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json(almacenes)
  } catch (error) {
    console.error('Almacenes GET error:', error)
    return NextResponse.json({ error: 'Error al obtener almacenes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = session.user as any
    if (!['super_admin', 'admin'].includes(user.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, direccion, telefono, encargado, empresaId } = body

    if (!nombre || !empresaId) {
      return NextResponse.json({ error: 'Nombre y empresaId son requeridos' }, { status: 400 })
    }

    // Admin can only create almacenes in their own empresa
    if (user.rol === 'admin' && user.empresaId && empresaId !== user.empresaId) {
      return NextResponse.json({ error: 'Sin permisos para esta empresa' }, { status: 403 })
    }

    const almacen = await db.almacen.create({
      data: {
        nombre,
        direccion: direccion ?? null,
        telefono: telefono ?? null,
        encargado: encargado ?? null,
        empresaId,
      },
    })

    return NextResponse.json(almacen, { status: 201 })
  } catch (error: unknown) {
    console.error('Almacenes POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al crear almacén'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
