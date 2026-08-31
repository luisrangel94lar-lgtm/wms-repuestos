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
    const user = session.user as any

    const { searchParams } = new URL(request.url)
    const idProducto = searchParams.get('idProducto')
    const idTipo = searchParams.get('idTipo')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    const where: Record<string, unknown> = {}
    if (idProducto) where.idProducto = parseInt(idProducto, 10)
    if (idTipo) where.idTipo = parseInt(idTipo, 10)
    if (fechaDesde || fechaHasta) {
      where.fecha = {} as Record<string, unknown>
      if (fechaDesde) (where.fecha as Record<string, unknown>).gte = new Date(fechaDesde)
      if (fechaHasta) (where.fecha as Record<string, unknown>).lte = new Date(fechaHasta)
    }

    // Role-based filtering
    if (user.rol !== 'super_admin') {
      if (['gerente', 'vendedor', 'tecnico'].includes(user.rol) && user.almacenId) {
        where.almacenId = user.almacenId
      } else if (user.rol === 'admin' && user.empresaId) {
        const almacenes = await db.almacen.findMany({
          where: { empresaId: user.empresaId },
          select: { id: true },
        })
        where.almacenId = { in: almacenes.map((a) => a.id) }
      }
    }

    const movimientos = await db.movimiento.findMany({
      where,
      include: { producto: true, ubicacion: true, tipoMovimiento: true },
      orderBy: { fecha: 'desc' },
    })
    return NextResponse.json(movimientos)
  } catch (error) {
    console.error('Movimientos GET error:', error)
    return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = session.user as any

    const body = await request.json()
    const movAlmacenId = user.almacenId ?? body.almacenId ?? null

    // Batch mode
    if (Array.isArray(body.batch)) {
      const batch = body.batch as {
        idProducto: number
        idUbicacion: number
        idTipo: number
        cantidad: number
        costoUnitario?: number
        referencia?: string
        usuario?: string
        observacion?: string
      }[]

      if (batch.length === 0) {
        return NextResponse.json({ error: 'El lote no puede estar vacío' }, { status: 400 })
      }

      const results = await db.$transaction(async (tx) => {
        const created: any[] = []
        for (const item of batch) {
          const tipo = await tx.tipoMovimiento.findUnique({ where: { id: item.idTipo } })
          if (!tipo) throw new Error(`Tipo de movimiento ${item.idTipo} no encontrado`)

          const mov = await tx.movimiento.create({
            data: {
              idProducto: item.idProducto,
              idUbicacion: item.idUbicacion ?? null,
              idTipo: item.idTipo,
              cantidad: item.cantidad,
              costoUnitario: item.costoUnitario ?? null,
              referencia: item.referencia ?? null,
              usuario: item.usuario ?? null,
              observacion: item.observacion ?? null,
              almacenId: movAlmacenId,
            },
            include: { producto: true, ubicacion: true, tipoMovimiento: true },
          })

          if (item.idUbicacion) {
            if (tipo.nombre === 'ENTRADA') {
              await tx.stock.upsert({
                where: { idProducto_idUbicacion: { idProducto: item.idProducto, idUbicacion: item.idUbicacion } },
                create: { idProducto: item.idProducto, idUbicacion: item.idUbicacion, cantidad: item.cantidad },
                update: { cantidad: { increment: item.cantidad } },
              })
            } else if (tipo.nombre === 'SALIDA') {
              const existing = await tx.stock.findUnique({
                where: { idProducto_idUbicacion: { idProducto: item.idProducto, idUbicacion: item.idUbicacion } },
              })
              if (!existing || existing.cantidad < item.cantidad) {
                throw new Error('Stock insuficiente para la salida')
              }
              await tx.stock.update({
                where: { idProducto_idUbicacion: { idProducto: item.idProducto, idUbicacion: item.idUbicacion } },
                data: { cantidad: { decrement: item.cantidad } },
              })
            } else if (tipo.nombre === 'AJUSTE') {
              await tx.stock.upsert({
                where: { idProducto_idUbicacion: { idProducto: item.idProducto, idUbicacion: item.idUbicacion } },
                create: { idProducto: item.idProducto, idUbicacion: item.idUbicacion, cantidad: item.cantidad },
                update: { cantidad: item.cantidad },
              })
            }
          }
          created.push(mov)
        }
        return created
      })

      return NextResponse.json(results, { status: 201 })
    }

    // Single movement
    const { idProducto, idUbicacion, idTipo, cantidad, costoUnitario, referencia, usuario, observacion } = body

    const tipo = await db.tipoMovimiento.findUnique({ where: { id: idTipo } })
    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de movimiento no encontrado' }, { status: 400 })
    }

    const mov = await db.movimiento.create({
      data: {
        idProducto,
        idUbicacion: idUbicacion ?? null,
        idTipo,
        cantidad,
        costoUnitario: costoUnitario ?? null,
        referencia: referencia ?? null,
        usuario: usuario ?? null,
        observacion: observacion ?? null,
        almacenId: movAlmacenId,
      },
    })

    if (idUbicacion) {
      if (tipo.nombre === 'ENTRADA') {
        await db.stock.upsert({
          where: { idProducto_idUbicacion: { idProducto, idUbicacion } },
          create: { idProducto, idUbicacion, cantidad },
          update: { cantidad: { increment: cantidad } },
        })
      } else if (tipo.nombre === 'SALIDA') {
        const existing = await db.stock.findUnique({
          where: { idProducto_idUbicacion: { idProducto, idUbicacion } },
        })
        if (!existing || existing.cantidad < cantidad) {
          return NextResponse.json(
            { error: 'Stock insuficiente para la salida' },
            { status: 400 }
          )
        }
        await db.stock.update({
          where: { idProducto_idUbicacion: { idProducto, idUbicacion } },
          data: { cantidad: { decrement: cantidad } },
        })
      } else if (tipo.nombre === 'AJUSTE') {
        await db.stock.upsert({
          where: { idProducto_idUbicacion: { idProducto, idUbicacion } },
          create: { idProducto, idUbicacion, cantidad },
          update: { cantidad },
        })
      }
    }

    return NextResponse.json(mov, { status: 201 })
  } catch (error: unknown) {
    console.error('Movimientos POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al crear movimiento'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
