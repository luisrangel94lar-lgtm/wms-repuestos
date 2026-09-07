import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManageCatalog, getTenantUser, tenantWhere } from '@/lib/tenant'

export async function POST(request: NextRequest) {
  try {
    const { idProducto, idEquipo } = await request.json()
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!canManageCatalog(user)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    const product = await db.producto.findFirst({ where: { id: idProducto, ...tenantWhere(user) } })
    if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    const pe = await db.productoEquipo.create({
      data: { idProducto, idEquipo },
    })
    return NextResponse.json(pe, { status: 201 })
  } catch (error: unknown) {
    console.error('ProductoEquipo POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al agregar compatibilidad'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { idProducto, idEquipo } = await request.json()
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!canManageCatalog(user)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    const product = await db.producto.findFirst({ where: { id: idProducto, ...tenantWhere(user) } })
    if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    await db.productoEquipo.delete({
      where: { idProducto_idEquipo: { idProducto, idEquipo } },
    })
    return NextResponse.json({ message: 'Compatibilidad eliminada' })
  } catch (error) {
    console.error('ProductoEquipo DELETE error:', error)
    return NextResponse.json({ error: 'Error al eliminar compatibilidad' }, { status: 500 })
  }
}
