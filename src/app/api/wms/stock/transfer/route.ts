import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { idProducto, idUbicacionOrigen, idUbicacionDestino, cantidad } = await request.json()

    // Validate input
    if (!idProducto || !idUbicacionOrigen || !idUbicacionDestino || !cantidad) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos: idProducto, idUbicacionOrigen, idUbicacionDestino, cantidad' },
        { status: 400 },
      )
    }

    if (idUbicacionOrigen === idUbicacionDestino) {
      return NextResponse.json(
        { error: 'La ubicación de origen y destino deben ser diferentes' },
        { status: 400 },
      )
    }

    if (cantidad <= 0) {
      return NextResponse.json(
        { error: 'La cantidad debe ser mayor a 0' },
        { status: 400 },
      )
    }

    // Execute transfer atomically
    const result = await db.$transaction(async (tx) => {
      // 1. Create TRASLADO movement record (idTipo = 4)
      await tx.movimiento.create({
        data: {
          idProducto,
          idUbicacion: idUbicacionOrigen,
          idTipo: 4,
          cantidad,
          observacion: `Traslado: ubicación ${idUbicacionOrigen} → ${idUbicacionDestino}`,
        },
      })

      // 2. Decrease stock at origin
      const stockOrigen = await tx.stock.findUnique({
        where: { idProducto_idUbicacion: { idProducto, idUbicacion: idUbicacionOrigen } },
      })

      if (!stockOrigen || stockOrigen.cantidad < cantidad) {
        throw new Error('Stock insuficiente en la ubicación de origen')
      }

      const newCantidadOrigen = stockOrigen.cantidad - cantidad
      await tx.stock.upsert({
        where: { idProducto_idUbicacion: { idProducto, idUbicacion: idUbicacionOrigen } },
        update: { cantidad: newCantidadOrigen },
        create: { idProducto, idUbicacion: idUbicacionOrigen, cantidad: newCantidadOrigen },
      })

      // 3. Increase stock at destination
      const stockDestino = await tx.stock.findUnique({
        where: { idProducto_idUbicacion: { idProducto, idUbicacion: idUbicacionDestino } },
      })

      const newCantidadDestino = (stockDestino?.cantidad ?? 0) + cantidad
      await tx.stock.upsert({
        where: { idProducto_idUbicacion: { idProducto, idUbicacion: idUbicacionDestino } },
        update: { cantidad: newCantidadDestino },
        create: { idProducto, idUbicacion: idUbicacionDestino, cantidad: newCantidadDestino },
      })

      return {
        idProducto,
        idUbicacionOrigen,
        idUbicacionDestino,
        cantidad,
        stockOrigenRestante: newCantidadOrigen,
        stockDestinoNuevo: newCantidadDestino,
      }
    })

    return NextResponse.json({ message: 'Traslado realizado correctamente', ...result })
  } catch (error: unknown) {
    console.error('Stock transfer error:', error)
    const msg = error instanceof Error ? error.message : 'Error al realizar el traslado'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
