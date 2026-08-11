import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10)
    const search = searchParams.get('search') ?? ''
    const idCategoria = searchParams.get('categoria')
    const idMarca = searchParams.get('marca')
    const bajoStock = searchParams.get('bajoStock') === 'true'

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { sku: { contains: search } },
        { nombre: { contains: search } },
        { descripcion: { contains: search } },
      ]
    }
    if (idCategoria) where.idCategoria = parseInt(idCategoria, 10)
    if (idMarca) where.idMarca = parseInt(idMarca, 10)

    const [productos, total] = await Promise.all([
      db.producto.findMany({
        where,
        include: { categoria: true, marca: true, stocks: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { nombre: 'asc' },
      }),
      db.producto.count({ where }),
    ])

    let items = productos.map((p) => ({
      ...p,
      totalStock: p.stocks.reduce((sum, s) => sum + s.cantidad, 0),
    }))

    if (bajoStock) {
      items = items.filter((p) => p.totalStock < p.stockMinimo)
    }

    return NextResponse.json({ items, total, page, pageSize })
  } catch (error) {
    console.error('Productos GET error:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const producto = await db.producto.create({
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
        activo: body.activo ?? true,
      },
    })
    return NextResponse.json(producto, { status: 201 })
  } catch (error: unknown) {
    console.error('Productos POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al crear producto'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
