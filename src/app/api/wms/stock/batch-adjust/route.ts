import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items, cantidad, tipo } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Se requieren items' }, { status: 400 })
    }
    if (typeof cantidad !== 'number' || cantidad <= 0) {
      return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 })
    }
    if (tipo !== 'add' && tipo !== 'subtract') {
      return NextResponse.json({ error: 'Tipo debe ser add o subtract' }, { status: 400 })
    }

    const results = await db.$transaction(async (tx) => {
      const updated: Array<{ idProducto: number; idUbicacion: number; prevQty: number; newQty: number }> = []

      for (const item of items) {
        const { idProducto, idUbicacion } = item

        // Find existing stock
        const existing = await tx.stock.findUnique({
          where: {
            idProducto_idUbicacion: {
              idProducto: Number(idProducto),
              idUbicacion: Number(idUbicacion),
            },
          },
        })

        if (existing) {
          const newQty = tipo === 'add'
            ? existing.cantidad + cantidad
            : Math.max(0, existing.cantidad - cantidad)

          await tx.stock.update({
            where: {
              idProducto_idUbicacion: {
                idProducto: Number(idProducto),
                idUbicacion: Number(idUbicacion),
              },
            },
            data: { cantidad: newQty },
          })

          updated.push({
            idProducto: Number(idProducto),
            idUbicacion: Number(idUbicacion),
            prevQty: existing.cantidad,
            newQty,
          })
        }
      }

      // Create a single AJUSTE movement referencing all items
      const ajusteTipo = await tx.tipoMovimiento.findFirst({
        where: { nombre: 'AJUSTE' },
      })

      if (ajusteTipo) {
        const firstItem = items[0]
        await tx.movimiento.create({
          data: {
            idProducto: Number(firstItem.idProducto),
            idUbicacion: Number(firstItem.idUbicacion),
            idTipo: ajusteTipo.id,
            cantidad,
            referencia: `Ajuste masivo (${tipo === 'add' ? '+' : '-'}${cantidad}) ${items.length} productos`,
            observacion: tipo === 'add' ? 'Ajuste masivo - suma' : 'Ajuste masivo - resta',
          },
        })
      }

      return updated
    })

    return NextResponse.json({ success: true, updated: results })
  } catch (error) {
    console.error('Batch adjust error:', error)
    return NextResponse.json({ error: 'Error al ajustar stock en lote' }, { status: 500 })
  }
}
