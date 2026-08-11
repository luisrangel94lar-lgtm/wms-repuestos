import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const equipoId = searchParams.get('idEquipo')

  if (!equipoId) {
    return NextResponse.json({ error: 'idEquipo requerido' }, { status: 400 })
  }

  try {
    const compatibilities = await db.productoEquipo.findMany({
      where: { idEquipo: Number(equipoId) },
      include: {
        producto: {
          include: {
            stocks: { include: { ubicacion: true } },
            categoria: true,
            marca: true,
          },
        },
      },
    })

    const products = compatibilities.map(c => {
      const totalStock = c.producto.stocks.reduce((sum: number, s: any) => sum + s.cantidad, 0)
      return {
        id: c.producto.id,
        sku: c.producto.sku,
        nombre: c.producto.nombre,
        descripcion: c.producto.descripcion,
        categoria: c.producto.categoria?.nombre,
        marca: c.producto.marca?.nombre,
        costoUnitario: c.producto.costoUnitario,
        precioVenta: c.producto.precioVenta,
        stockMinimo: c.producto.stockMinimo,
        totalStock,
        activo: c.producto.activo,
      }
    })

    return NextResponse.json(products)
  } catch (error) {
    return NextResponse.json({ error: 'Error al buscar productos' }, { status: 500 })
  }
}
