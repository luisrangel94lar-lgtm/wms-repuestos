import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManageCatalog, getTenantUser, tenantWhere } from '@/lib/tenant'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const empresaId = new URL(request.url).searchParams.get('empresaId')
    const producto = await db.producto.findFirst({
      where: { id: parseInt(id, 10), ...tenantWhere(user, empresaId) },
      include: { stocks: true, productoEquipo: { include: { equipo: { include: { marca: true } } } } },
    })
    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }
    return NextResponse.json(producto)
  } catch (error) {
    console.error('Producto GET error:', error)
    return NextResponse.json({ error: 'Error al obtener producto' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!canManageCatalog(user)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    const existing = await db.producto.findFirst({ where: { id: parseInt(id, 10), ...tenantWhere(user) } })
    if (!existing) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    const body = await request.json()
    const producto = await db.producto.update({
      where: { id: parseInt(id, 10) },
      data: {
        sku: body.sku,
        nombre: body.nombre,
        descripcion: body.descripcion ?? null,
        idCategoria: body.idCategoria ?? null,
        idMarca: body.idMarca ?? null,
        codigoBarras: body.codigoBarras ?? null,
        unidadMedida: body.unidadMedida ?? 'unidad',
        costoUnitario: body.costoUnitario ?? 0,
        precioVenta: body.precioVenta ?? 0,
        stockMinimo: body.stockMinimo ?? 0,
        stockMaximo: body.stockMaximo ?? null,
        fotoUrl: body.fotoUrl ?? null,
        activo: body.activo,
      },
    })
    return NextResponse.json(producto)
  } catch (error: unknown) {
    console.error('Producto PUT error:', error)
    const msg = error instanceof Error ? error.message : 'Error al actualizar producto'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!canManageCatalog(user)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    const existing = await db.producto.findFirst({ where: { id: parseInt(id, 10), ...tenantWhere(user) } })
    if (!existing) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    await db.producto.delete({ where: { id: parseInt(id, 10) } })
    return NextResponse.json({ message: 'Producto eliminado' })
  } catch (error) {
    console.error('Producto DELETE error:', error)
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 })
  }
}
