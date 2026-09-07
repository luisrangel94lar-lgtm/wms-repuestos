import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantUser, resolveEmpresaId, tenantWhere } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = getTenantUser(session)!

    const { searchParams } = new URL(request.url)
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const idCliente = searchParams.get('idCliente')
    const estado = searchParams.get('estado')

    const where: Record<string, unknown> = tenantWhere(user, searchParams.get('empresaId'))
    if (fechaDesde || fechaHasta) {
      where.fecha = {} as Record<string, unknown>
      if (fechaDesde) (where.fecha as Record<string, unknown>).gte = new Date(fechaDesde)
      if (fechaHasta) (where.fecha as Record<string, unknown>).lte = new Date(fechaHasta)
    }
    if (idCliente) where.idCliente = parseInt(idCliente, 10)
    if (estado) where.estado = estado

    if (user.rol !== 'super_admin') {
      if (['gerente', 'cajero', 'vendedor', 'tecnico'].includes(user.rol) && user.almacenId) {
        where.almacenId = user.almacenId
      }
    }

    const ventas = await db.venta.findMany({
      where,
      include: {
        cliente: true,
        detalles: { include: { producto: true } },
      },
      orderBy: { fecha: 'desc' },
    })
    return NextResponse.json(ventas)
  } catch (error) {
    console.error('Ventas GET error:', error)
    return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = getTenantUser(session)!

    const body = await request.json()
    const { idCliente, detalles } = body
    const empresaId = resolveEmpresaId(user, body.empresaId)

    if (!empresaId || !idCliente || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return NextResponse.json({ error: 'idCliente y detalles son requeridos' }, { status: 400 })
    }

    const cliente = await db.cliente.findFirst({ where: { id: Number(idCliente), empresaId } })
    if (!cliente) return NextResponse.json({ error: 'El cliente no pertenece a la empresa' }, { status: 400 })

    const productIds = detalles.map((d: { idProducto: number }) => Number(d.idProducto))
    const ownedProducts = await db.producto.count({ where: { id: { in: productIds }, empresaId, activo: true } })
    if (ownedProducts !== new Set(productIds).size) {
      return NextResponse.json({ error: 'Hay productos que no pertenecen a la empresa' }, { status: 400 })
    }

    // Generate folio
    const now = new Date()
    const datePart = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0')

    const seq = (await db.venta.count({ where: { empresaId } })) + 1
    const folio = `V-${datePart}-${String(seq).padStart(5, '0')}`

    // Calculate totals
    let subtotal = 0
    for (const d of detalles) {
      subtotal += d.cantidad * d.precioUnitario
    }
    const total = subtotal

    // Determine almacenId from session or body
    const ventaAlmacenId = user.almacenId ?? body.almacenId ?? null
    if (ventaAlmacenId) {
      const almacen = await db.almacen.findFirst({ where: { id: Number(ventaAlmacenId), empresaId, activo: true } })
      if (!almacen) return NextResponse.json({ error: 'El almacén no pertenece a la empresa' }, { status: 400 })
    }

    // Create the venta with details inside a transaction
    const venta = await db.$transaction(async (tx) => {
      const created = await tx.venta.create({
        data: {
          empresaId,
          idCliente,
          folio,
          subtotal,
          total,
          estado: 'COMPLETADA',
          almacenId: ventaAlmacenId,
        },
      })

      // Find SALIDA type
      const tipoSalida = await tx.tipoMovimiento.findFirst({
        where: { nombre: 'SALIDA' },
      })

      for (const d of detalles) {
        await tx.ventaDetalle.create({
          data: {
            idVenta: created.id,
            idProducto: d.idProducto,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
          },
        })

        // Decrease stock via SALIDA movement
        const stockEntry = await tx.stock.findFirst({
          where: {
            idProducto: d.idProducto,
            ubicacion: ventaAlmacenId ? { almacenId: Number(ventaAlmacenId) } : undefined,
          },
        })

        if (stockEntry) {
          if (stockEntry.cantidad < d.cantidad) {
            throw new Error(`Stock insuficiente para producto ${d.idProducto}`)
          }

          await tx.stock.update({
            where: { idProducto_idUbicacion: { idProducto: d.idProducto, idUbicacion: stockEntry.idUbicacion } },
            data: { cantidad: { decrement: d.cantidad } },
          })

          if (tipoSalida) {
            await tx.movimiento.create({
              data: {
                empresaId,
                idProducto: d.idProducto,
                idUbicacion: stockEntry.idUbicacion,
                idTipo: tipoSalida.id,
                cantidad: d.cantidad,
                referencia: folio,
                almacenId: ventaAlmacenId,
              },
            })
          }
        }
      }

      return created
    })

    const result = await db.venta.findUnique({
      where: { id: venta.id },
      include: { cliente: true, detalles: { include: { producto: true } } },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: unknown) {
    console.error('Ventas POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al crear venta'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
