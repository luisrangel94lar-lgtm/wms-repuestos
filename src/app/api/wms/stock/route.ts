import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idProducto = searchParams.get('idProducto')

    const where: Record<string, unknown> = {}
    if (idProducto) where.idProducto = parseInt(idProducto, 10)

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
    const { idProducto, idUbicacion, cantidad } = await request.json()

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
