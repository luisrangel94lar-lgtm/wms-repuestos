import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWarehouseLimit } from '@/lib/plans'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = session.user as any

    const where: Record<string, unknown> = {}
    let scopedEmpresaId: number | null = null
    const requestedEmpresaId = Number(new URL(request.url).searchParams.get('empresaId'))
    if (user.rol === 'super_admin' && Number.isInteger(requestedEmpresaId) && requestedEmpresaId > 0) {
      where.empresaId = requestedEmpresaId
      scopedEmpresaId = requestedEmpresaId
    }
    if (user.rol === 'admin') {
      where.empresaId = user.empresaId ?? -1
      scopedEmpresaId = user.empresaId ?? null
    }
    if (['gerente', 'cajero', 'vendedor', 'tecnico'].includes(user.rol)) {
      where.id = user.almacenId ?? -1
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

    const headers = new Headers()
    if (scopedEmpresaId) {
      const empresa = await db.empresa.findUnique({
        where: { id: scopedEmpresaId },
        select: { plan: true },
      })
      if (empresa) {
        headers.set('X-Warehouse-Plan', empresa.plan)
        headers.set('X-Warehouse-Limit', String(getWarehouseLimit(empresa.plan)))
        headers.set('X-Warehouse-Used', String(almacenes.length))
      }
    }

    return NextResponse.json(almacenes, { headers })
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

    if (!nombre || !empresaId || !Number.isInteger(Number(empresaId))) {
      return NextResponse.json({ error: 'Nombre y empresaId son requeridos' }, { status: 400 })
    }

    const targetEmpresaId = Number(empresaId)

    // Admin can only create almacenes in their own empresa
    if (user.rol === 'admin' && targetEmpresaId !== Number(user.empresaId)) {
      return NextResponse.json({ error: 'Sin permisos para esta empresa' }, { status: 403 })
    }


    const empresa = await db.empresa.findUnique({
      where: { id: targetEmpresaId },
      select: { plan: true, activa: true },
    })
    if (!empresa || !empresa.activa) {
      return NextResponse.json({ error: 'La empresa no existe o está inactiva' }, { status: 400 })
    }

    const limit = getWarehouseLimit(empresa.plan)
    const used = await db.almacen.count({ where: { empresaId: targetEmpresaId } })
    if (used >= limit) {
      return NextResponse.json({
        error: `El plan ${empresa.plan} permite un máximo de ${limit} almacén${limit === 1 ? '' : 'es'}. Actualiza el plan para crear otro.`,
        code: 'WAREHOUSE_LIMIT_REACHED',
        plan: empresa.plan,
        limit,
        used,
      }, { status: 409 })
    }

    const almacen = await db.almacen.create({
      data: {
        nombre,
        direccion: direccion ?? null,
        telefono: telefono ?? null,
        encargado: encargado ?? null,
        empresaId: targetEmpresaId,
      },
    })

    return NextResponse.json(almacen, { status: 201 })
  } catch (error: unknown) {
    console.error('Almacenes POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al crear almacén'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
