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

    // Products are global (not per-almacen), so no data filtering needed.
    // Auth check above is sufficient.

    let items: any[]
    let total: number

    if (bajoStock) {
      const productos = await db.producto.findMany({
        where,
        include: { categoria: true, marca: true, stocks: true },
        orderBy: { nombre: 'asc' },
      })
      const mapped = productos.map((p) => ({
        ...p,
        totalStock: p.stocks.reduce((sum: number, s: any) => sum + s.cantidad, 0),
      })).filter((p) => p.totalStock < p.stockMinimo)
      total = mapped.length
      items = mapped.slice((page - 1) * pageSize, page * pageSize)
    } else {
      const [productos, count] = await Promise.all([
        db.producto.findMany({
          where,
          include: { categoria: true, marca: true, stocks: true },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { nombre: 'asc' },
        }),
        db.producto.count({ where }),
      ])
      total = count
      items = productos.map((p) => ({
        ...p,
        totalStock: p.stocks.reduce((sum: number, s: any) => sum + s.cantidad, 0),
      }))
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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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
