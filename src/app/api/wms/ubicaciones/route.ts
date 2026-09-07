import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = session.user as any

    const { searchParams } = new URL(request.url)
    const activos = searchParams.get('activos')

    const where: Record<string, unknown> = {}
    if (activos === 'true') where.activo = true

    // Role-based filtering
    if (user.rol !== 'super_admin') {
      if (['gerente', 'cajero', 'vendedor', 'tecnico'].includes(user.rol) && user.almacenId) {
        where.almacenId = user.almacenId
      } else if (user.rol === 'admin' && user.empresaId) {
        const almacenes = await db.almacen.findMany({
          where: { empresaId: user.empresaId },
          select: { id: true },
        })
        where.almacenId = { in: almacenes.map((a) => a.id) }
      }
    }

    const ubicaciones = await db.ubicacion.findMany({
      where,
      orderBy: [{ pasillo: 'asc' }, { estante: 'asc' }, { nivel: 'asc' }],
    })
    return NextResponse.json(ubicaciones)
  } catch (error) {
    console.error('Ubicaciones GET error:', error)
    return NextResponse.json({ error: 'Error al obtener ubicaciones' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = session.user as any
    if (!['admin', 'super_admin', 'gerente'].includes(user.rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const almacenId = user.almacenId ?? body.almacenId ?? null
    if (!almacenId) return NextResponse.json({ error: 'Almacén requerido' }, { status: 400 })
    const warehouse = await db.almacen.findFirst({
      where: { id: Number(almacenId), ...(user.rol === 'super_admin' ? {} : { empresaId: user.empresaId }) },
    })
    if (!warehouse) return NextResponse.json({ error: 'Almacén fuera de la empresa' }, { status: 400 })
    const ubicacion = await db.ubicacion.create({
      data: {
        pasillo: body.pasillo,
        estante: body.estante,
        nivel: body.nivel,
        activo: body.activo ?? true,
        almacenId,
      },
    })
    return NextResponse.json(ubicacion, { status: 201 })
  } catch (error: unknown) {
    console.error('Ubicaciones POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al crear ubicación'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as any
    if (!['admin', 'super_admin', 'gerente'].includes(user.rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    const { id, pasillo, estante, nivel, activo } = await request.json()
    const existing = await db.ubicacion.findFirst({ where: { id, almacen: user.rol === 'super_admin' ? {} : { empresaId: user.empresaId } } })
    if (!existing) return NextResponse.json({ error: 'Ubicación no encontrada' }, { status: 404 })

    const ubicacion = await db.ubicacion.update({
      where: { id },
      data: { pasillo, estante, nivel, activo },
    })

    return NextResponse.json(ubicacion)
  } catch (error: unknown) {
    console.error('Ubicaciones PUT error:', error)
    const msg = error instanceof Error ? error.message : 'Error al actualizar ubicación'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const user = session.user as any
    if (!['admin', 'super_admin', 'gerente'].includes(user.rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    const id = parseInt(searchParams.get('id')!, 10)

    if (!id) {
      return NextResponse.json({ error: 'ID de ubicación es requerido' }, { status: 400 })
    }
    const existing = await db.ubicacion.findFirst({ where: { id, almacen: user.rol === 'super_admin' ? {} : { empresaId: user.empresaId } } })
    if (!existing) return NextResponse.json({ error: 'Ubicación no encontrada' }, { status: 404 })

    const stockEntries = await db.stock.findMany({
      where: { idUbicacion: id },
    })

    if (stockEntries.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar la ubicación porque tiene registros de stock asociados' },
        { status: 400 },
      )
    }

    const ubicacion = await db.ubicacion.update({
      where: { id },
      data: { activo: false },
    })

    return NextResponse.json({ message: 'Ubicación desactivada correctamente', ubicacion })
  } catch (error: unknown) {
    console.error('Ubicaciones DELETE error:', error)
    const msg = error instanceof Error ? error.message : 'Error al eliminar ubicación'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
