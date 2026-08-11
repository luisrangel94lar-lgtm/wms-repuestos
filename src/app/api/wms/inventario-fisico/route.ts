import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const productos = await db.producto.findMany({
      where: { activo: true },
      include: {
        stocks: {
          include: { ubicacion: true },
          where: { ubicacion: { activo: true } },
        },
        categoria: { select: { nombre: true } },
        marca: { select: { nombre: true } },
      },
      orderBy: { sku: 'asc' },
    })

    const result = productos.map((p) => {
      const ubicaciones = p.stocks.map((s) => ({
        idUbicacion: s.idUbicacion,
        ubicacion: `${s.ubicacion.pasillo}-${s.ubicacion.estante}-${s.ubicacion.nivel}`,
        cantidadSistema: s.cantidad,
      }))
      const totalSistema = ubicaciones.reduce((sum, u) => sum + u.cantidadSistema, 0)
      return {
        idProducto: p.id,
        sku: p.sku,
        nombre: p.nombre,
        categoria: p.categoria?.nombre ?? null,
        marca: p.marca?.nombre ?? null,
        ubicaciones,
        totalSistema,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Inventario físico GET error:', error)
    return NextResponse.json({ error: 'Error al obtener inventario' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const items: { idProducto: number; idUbicacion: number; cantidadContada: number; notas?: string }[] = body.items

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un item' }, { status: 400 })
    }

    const ajusteTipo = await db.tipoMovimiento.findFirst({ where: { nombre: 'AJUSTE' } })
    if (!ajusteTipo) {
      return NextResponse.json({ error: 'Tipo de movimiento AJUSTE no encontrado' }, { status: 400 })
    }

    let itemsWithVariance = 0
    let totalVariance = 0
    const createdMovements: any[] = []

    for (const item of items) {
      const existing = await db.stock.findUnique({
        where: { idProducto_idUbicacion: { idProducto: item.idProducto, idUbicacion: item.idUbicacion } },
      })
      const currentStock = existing?.cantidad ?? 0
      const variance = item.cantidadContada - currentStock

      if (variance !== 0) {
        itemsWithVariance++
        totalVariance += variance

        await db.stock.upsert({
          where: { idProducto_idUbicacion: { idProducto: item.idProducto, idUbicacion: item.idUbicacion } },
          create: { idProducto: item.idProducto, idUbicacion: item.idUbicacion, cantidad: item.cantidadContada },
          update: { cantidad: item.cantidadContada },
        })

        const mov = await db.movimiento.create({
          data: {
            idProducto: item.idProducto,
            idUbicacion: item.idUbicacion,
            idTipo: ajusteTipo.id,
            cantidad: item.cantidadContada,
            referencia: 'Inventario Físico',
            observacion: item.notas ?? `Ajuste: era ${currentStock}, ahora ${item.cantidadContada} (varianza: ${variance > 0 ? '+' : ''}${variance})`,
            usuario: 'Admin',
          },
        })
        createdMovements.push(mov)
      }
    }

    return NextResponse.json({
      totalItems: items.length,
      itemsWithVariance,
      totalVariance,
      movementsCreated: createdMovements.length,
    })
  } catch (error: unknown) {
    console.error('Inventario físico POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al guardar conteo'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
