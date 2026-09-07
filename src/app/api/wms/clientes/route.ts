import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantUser, resolveEmpresaId, tenantWhere } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const session = await getServerSession(authOptions)
    const user = getTenantUser(session)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const search = searchParams.get('search') ?? ''

    const where: Record<string, unknown> = tenantWhere(user, searchParams.get('empresaId'))
    if (search) {
      where.OR = [
        { nombre: { contains: search } },
        { telefono: { contains: search } },
      ]
    }

    const clientes = await db.cliente.findMany({
      where,
      include: {
        _count: { select: { ventas: true } },
      },
      orderBy: { nombre: 'asc' },
    })
    return NextResponse.json(clientes)
  } catch (error) {
    console.error('Clientes GET error:', error)
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = getTenantUser(session)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await request.json()
    const empresaId = resolveEmpresaId(user, body.empresaId)
    if (!empresaId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 })
    const cliente = await db.cliente.create({
      data: {
        empresaId,
        nombre: body.nombre,
        telefono: body.telefono ?? null,
        email: body.email ?? null,
        tipoCliente: body.tipoCliente ?? 'Tecnico',
      },
    })
    return NextResponse.json(cliente, { status: 201 })
  } catch (error: unknown) {
    console.error('Clientes POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al crear cliente'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
