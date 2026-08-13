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

    const { id } = await params
    const almacenId = parseInt(id, 10)

    const almacen = await db.almacen.findUnique({
      where: { id: almacenId },
      include: {
        empresa: { select: { id: true, nombre: true } },
        _count: {
          select: {
            usuarios: true,
            ubicaciones: true,
          },
        },
      },
    })

    if (!almacen) {
      return NextResponse.json({ error: 'Almacén no encontrado' }, { status: 404 })
    }

    return NextResponse.json(almacen)
  } catch (error) {
    console.error('Almacén GET error:', error)
    return NextResponse.json({ error: 'Error al obtener almacén' }, { status: 500 })
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
    if (!['super_admin', 'admin'].includes(user.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const almacenId = parseInt(id, 10)
    const body = await request.json()
    const { nombre, direccion, telefono, encargado, activo } = body

    // Check ownership for admin
    if (user.rol === 'admin' && user.empresaId) {
      const almacen = await db.almacen.findUnique({ where: { id: almacenId } })
      if (!almacen || almacen.empresaId !== user.empresaId) {
        return NextResponse.json({ error: 'Sin permisos para este almacén' }, { status: 403 })
      }
    }

    const almacen = await db.almacen.update({
      where: { id: almacenId },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(direccion !== undefined && { direccion }),
        ...(telefono !== undefined && { telefono }),
        ...(encargado !== undefined && { encargado }),
        ...(activo !== undefined && { activo }),
      },
    })

    return NextResponse.json(almacen)
  } catch (error: unknown) {
    console.error('Almacén PUT error:', error)
    const msg = error instanceof Error ? error.message : 'Error al actualizar almacén'
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
    if (!['super_admin', 'admin'].includes(user.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const almacenId = parseInt(id, 10)

    // Check ownership for admin
    if (user.rol === 'admin' && user.empresaId) {
      const almacen = await db.almacen.findUnique({ where: { id: almacenId } })
      if (!almacen || almacen.empresaId !== user.empresaId) {
        return NextResponse.json({ error: 'Sin permisos para este almacén' }, { status: 403 })
      }
    }

    const almacen = await db.almacen.update({
      where: { id: almacenId },
      data: { activo: false },
    })

    return NextResponse.json({ message: 'Almacén desactivado correctamente', almacen })
  } catch (error: unknown) {
    console.error('Almacén DELETE error:', error)
    const msg = error instanceof Error ? error.message : 'Error al desactivar almacén'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
