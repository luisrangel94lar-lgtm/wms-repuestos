import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const producto = await db.producto.findUnique({
      where: { id: parseInt(id, 10) },
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
    await db.producto.delete({ where: { id: parseInt(id, 10) } })
    return NextResponse.json({ message: 'Producto eliminado' })
  } catch (error) {
    console.error('Producto DELETE error:', error)
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 })
  }
}
