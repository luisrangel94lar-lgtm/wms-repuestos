import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const productos = await db.producto.findMany({
      where: { activo: true },
      include: {
        stocks: true,
        categoria: true,
        marca: true,
      },
    })

    const alertas = productos
      .map((p) => {
        const totalStock = p.stocks.reduce((sum, s) => sum + s.cantidad, 0)
        const deficiencia = p.stockMinimo - totalStock
        return {
          id: p.id,
          sku: p.sku,
          nombre: p.nombre,
          categoria: p.categoria?.nombre ?? null,
          marca: p.marca?.nombre ?? null,
          stockMinimo: p.stockMinimo,
          stockActual: totalStock,
          deficiencia: deficiencia > 0 ? deficiencia : 0,
        }
      })
      .filter((a) => a.deficiencia > 0)

    return NextResponse.json(alertas)
  } catch (error) {
    console.error('Alertas GET error:', error)
    return NextResponse.json({ error: 'Error al obtener alertas' }, { status: 500 })
  }
}
