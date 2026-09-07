import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantUser, tenantWhere } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const user = getTenantUser(session)!
    const idProducto = searchParams.get('idProducto')
    const idUbicacion = searchParams.get('idUbicacion')

    const where: Record<string, unknown> = { producto: tenantWhere(user, searchParams.get('empresaId')) }
    if (idProducto) where.idProducto = parseInt(idProducto, 10)
    if (idUbicacion) where.idUbicacion = parseInt(idUbicacion, 10)

    const stocks = await db.stock.findMany({
      where,
      include: { producto: true, ubicacion: true },
    })
    return NextResponse.json(stocks)
  } catch (error) {
    console.error('Stock GET error:', error)
    return NextResponse.json({ error: 'Error al obtener stock' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { idProducto, idUbicacion, cantidad } = await request.json()
    const user = getTenantUser(session)!
    if (!['admin', 'super_admin', 'gerente'].includes(user.rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    const producto = await db.producto.findFirst({ where: { id: idProducto, ...tenantWhere(user) } })
    const ubicacion = await db.ubicacion.findFirst({ where: { id: idUbicacion, almacen: tenantWhere(user) } })
    if (!producto || !ubicacion) return NextResponse.json({ error: 'Producto o ubicación fuera de la empresa' }, { status: 400 })

    const existing = await db.stock.findUnique({
      where: { idProducto_idUbicacion: { idProducto, idUbicacion } },
    })

    let stock
    if (existing) {
      stock = await db.stock.update({
        where: { idProducto_idUbicacion: { idProducto, idUbicacion } },
        data: { cantidad },
      })
    } else {
      stock = await db.stock.create({
        data: { idProducto, idUbicacion, cantidad },
      })
    }

    return NextResponse.json(stock)
  } catch (error: unknown) {
    console.error('Stock PUT error:', error)
    const msg = error instanceof Error ? error.message : 'Error al actualizar stock'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
