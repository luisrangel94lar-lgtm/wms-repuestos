import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantUser, resolveEmpresaId, tenantWhere } from '@/lib/tenant'
import { randomUUID } from 'crypto'
import { buildCheckoutUrl, getWompiConfig } from '@/lib/wompi'

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
        pagos: { orderBy: { fechaCreacion: 'desc' }, take: 1 },
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
    const metodoPago = String(body.metodoPago ?? 'EFECTIVO').toUpperCase()
    const empresaId = resolveEmpresaId(user, body.empresaId)

    if (!empresaId || !idCliente || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return NextResponse.json({ error: 'idCliente y detalles son requeridos' }, { status: 400 })
    }
    if (!['EFECTIVO', 'WOMPI'].includes(metodoPago)) {
      return NextResponse.json({ error: 'Método de pago no válido' }, { status: 400 })
    }
    if (detalles.some((d: { cantidad: number; precioUnitario: number }) => !Number.isInteger(Number(d.cantidad)) || Number(d.cantidad) <= 0 || Number(d.precioUnitario) < 0)) {
      return NextResponse.json({ error: 'Las cantidades y precios no son válidos' }, { status: 400 })
    }

    const cliente = await db.cliente.findFirst({ where: { id: Number(idCliente), empresaId } })
    if (!cliente) return NextResponse.json({ error: 'El cliente no pertenece a la empresa' }, { status: 400 })

    const productIds = detalles.map((d: { idProducto: number }) => Number(d.idProducto))
    const ownedProducts = await db.producto.findMany({
      where: { id: { in: productIds }, empresaId, activo: true },
      select: { id: true, precioVenta: true },
    })
    if (ownedProducts.length !== new Set(productIds).size) {
      return NextResponse.json({ error: 'Hay productos que no pertenecen a la empresa' }, { status: 400 })
    }
    const prices = new Map(ownedProducts.map(product => [product.id, product.precioVenta]))
    const quantities = new Map<number, number>()
    for (const detail of detalles) {
      const productId = Number(detail.idProducto)
      quantities.set(productId, (quantities.get(productId) ?? 0) + Number(detail.cantidad))
    }
    const saleDetails = [...quantities].map(([idProducto, cantidad]) => ({
      idProducto,
      cantidad,
      precioUnitario: prices.get(idProducto) ?? 0,
    }))

    // Generate folio
    const now = new Date()
    const datePart = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0')

    const seq = (await db.venta.count({ where: { empresaId } })) + 1
    const folio = `V-${datePart}-${String(seq).padStart(5, '0')}`

    // Calculate totals
    let subtotal = 0
    for (const d of saleDetails) {
      subtotal += d.cantidad * d.precioUnitario
    }
    const total = subtotal
    if (total <= 0) return NextResponse.json({ error: 'El total de la venta debe ser mayor que cero' }, { status: 400 })

    // Determine almacenId from session or body
    const ventaAlmacenId = user.almacenId ?? body.almacenId ?? null
    if (ventaAlmacenId) {
      const almacen = await db.almacen.findFirst({ where: { id: Number(ventaAlmacenId), empresaId, activo: true } })
      if (!almacen) return NextResponse.json({ error: 'El almacén no pertenece a la empresa' }, { status: 400 })
    }

    let wompiPayment: { reference: string; checkoutUrl: string; amountInCents: number } | null = null
    if (metodoPago === 'WOMPI') {
      const company = await db.empresa.findUnique({ where: { id: empresaId } })
      if (!company) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
      const wompi = getWompiConfig(company)
      const amountInCents = Math.round(total * 100)
      const reference = `WMS-${empresaId}-${folio}-${randomUUID().slice(0, 8)}`
      const checkoutUrl = buildCheckoutUrl({
        publicKey: wompi.publicKey,
        reference,
        amountInCents,
        currency: 'COP',
        integritySecret: wompi.integritySecret,
        redirectUrl: `${request.nextUrl.origin}/?page=ventas&wompi=${encodeURIComponent(reference)}`,
      })
      wompiPayment = { reference, checkoutUrl, amountInCents }
    }

    // Cash sales are finalized immediately. Wompi sales wait for the verified webhook.
    const venta = await db.$transaction(async (tx) => {
      const created = await tx.venta.create({
        data: {
          empresaId,
          idCliente,
          folio,
          subtotal,
          total,
          estado: metodoPago === 'WOMPI' ? 'PENDIENTE_PAGO' : 'COMPLETADA',
          almacenId: ventaAlmacenId,
        },
      })

      // Find SALIDA type
      const tipoSalida = metodoPago === 'EFECTIVO'
        ? await tx.tipoMovimiento.findFirst({ where: { nombre: 'SALIDA' } })
        : null
      if (metodoPago === 'EFECTIVO' && !tipoSalida) throw new Error('No existe el tipo de movimiento SALIDA')

      for (const d of saleDetails) {
        await tx.ventaDetalle.create({
          data: {
            idVenta: created.id,
            idProducto: d.idProducto,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
          },
        })

        if (metodoPago === 'WOMPI') continue

        // Decrease stock via SALIDA movement for immediate cash sales.
        const stockEntries = await tx.stock.findMany({
          where: {
            idProducto: d.idProducto,
            cantidad: { gt: 0 },
            ubicacion: ventaAlmacenId ? { almacenId: Number(ventaAlmacenId) } : undefined,
          },
          orderBy: { cantidad: 'desc' },
        })
        if (stockEntries.reduce((sum, entry) => sum + entry.cantidad, 0) < d.cantidad) {
          throw new Error(`Stock insuficiente para producto ${d.idProducto}`)
        }
        let remaining = d.cantidad
        for (const stockEntry of stockEntries) {
          if (remaining <= 0) break
          const quantity = Math.min(stockEntry.cantidad, remaining)
          const updated = await tx.stock.updateMany({
            where: { idProducto: d.idProducto, idUbicacion: stockEntry.idUbicacion, cantidad: { gte: quantity } },
            data: { cantidad: { decrement: quantity } },
          })
          if (updated.count !== 1) throw new Error('El inventario cambió mientras se registraba la venta')
          await tx.movimiento.create({
            data: {
              empresaId,
              idProducto: d.idProducto,
              idUbicacion: stockEntry.idUbicacion,
              idTipo: tipoSalida!.id,
              cantidad: quantity,
              referencia: folio,
              almacenId: ventaAlmacenId,
            },
          })
          remaining -= quantity
        }
      }

      if (wompiPayment) {
        await tx.pago.create({
          data: {
            empresaId,
            ventaId: created.id,
            referencia: wompiPayment.reference,
            metodo: 'WOMPI',
            montoCentavos: wompiPayment.amountInCents,
            moneda: 'COP',
            checkoutUrl: wompiPayment.checkoutUrl,
          },
        })
      }

      return created
    })

    const result = await db.venta.findUnique({
      where: { id: venta.id },
      include: {
        cliente: true,
        detalles: { include: { producto: true } },
        pagos: { orderBy: { fechaCreacion: 'desc' }, take: 1 },
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: unknown) {
    console.error('Ventas POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al crear venta'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
