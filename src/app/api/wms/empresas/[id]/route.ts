import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = session.user as any
    if (user.rol !== 'super_admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const empresa = await db.empresa.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        _count: {
          select: {
            usuarios: true,
            almacenes: true,
          },
        },
      },
    })

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    return NextResponse.json(empresa)
  } catch (error) {
    console.error('Empresa GET error:', error)
    return NextResponse.json({ error: 'Error al obtener empresa' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = session.user as any
    if (user.rol !== 'super_admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { nombre, nit, direccion, telefono, email, logo, plan, activa } = body

    const empresa = await db.empresa.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(nit !== undefined && { nit }),
        ...(direccion !== undefined && { direccion }),
        ...(telefono !== undefined && { telefono }),
        ...(email !== undefined && { email }),
        ...(logo !== undefined && { logo }),
        ...(plan !== undefined && { plan }),
        ...(activa !== undefined && { activa }),
      },
    })

    return NextResponse.json(empresa)
  } catch (error: unknown) {
    console.error('Empresa PUT error:', error)
    const msg = error instanceof Error ? error.message : 'Error al actualizar empresa'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = session.user as any
    if (user.rol !== 'super_admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const empresa = await db.empresa.update({
      where: { id: parseInt(id, 10) },
      data: { activa: false },
    })

    return NextResponse.json({ message: 'Empresa desactivada correctamente', empresa })
  } catch (error: unknown) {
    console.error('Empresa DELETE error:', error)
    const msg = error instanceof Error ? error.message : 'Error al desactivar empresa'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
