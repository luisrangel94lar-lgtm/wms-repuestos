import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [products, equipment, locations, clients, stockEntries, marcas, categorias] =
      await Promise.all([
        db.producto.findMany({
          include: { categoria: true, marca: true },
          orderBy: { id: 'asc' },
        }),
        db.equipo.findMany({
          include: { marca: true },
          orderBy: { id: 'asc' },
        }),
        db.ubicacion.findMany({
          orderBy: { id: 'asc' },
        }),
        db.cliente.findMany({
          orderBy: { id: 'asc' },
        }),
        db.stock.findMany({
          orderBy: [{ idProducto: 'asc' }, { idUbicacion: 'asc' }],
        }),
        db.marca.findMany({
          orderBy: { id: 'asc' },
        }),
        db.categoria.findMany({
          orderBy: { id: 'asc' },
        }),
      ])

    const productSkuMap = new Map<number, string>()
    for (const p of products) {
      productSkuMap.set(p.id, p.sku)
    }

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        marcas,
        categorias,
        products: products.map((p) => ({
          sku: p.sku,
          nombre: p.nombre,
          descripcion: p.descripcion,
          categoria: p.categoria?.nombre ?? null,
          marca: p.marca?.nombre ?? null,
          codigoBarras: p.codigoBarras,
          unidadMedida: p.unidadMedida,
          costoUnitario: p.costoUnitario,
          precioVenta: p.precioVenta,
          stockMinimo: p.stockMinimo,
          stockMaximo: p.stockMaximo,
          fotoUrl: p.fotoUrl,
          activo: p.activo,
        })),
        equipment: equipment.map((e) => ({
          modelo: e.modelo,
          marca: e.marca?.nombre ?? null,
          tipoEquipo: e.tipoEquipo,
        })),
        locations: locations.map((l) => ({
          pasillo: l.pasillo,
          estante: l.estante,
          nivel: l.nivel,
          activo: l.activo,
        })),
        clients: clients.map((c) => ({
          nombre: c.nombre,
          telefono: c.telefono,
          email: c.email,
          tipoCliente: c.tipoCliente,
        })),
        stock: stockEntries.map((s) => ({
          productoSku: productSkuMap.get(s.idProducto) ?? '',
          locationIndex: s.idUbicacion,
          cantidad: s.cantidad,
        })),
      },
    }

    return NextResponse.json(backup)
  } catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json({ error: 'Error al generar respaldo' }, { status: 500 })
  }
}
