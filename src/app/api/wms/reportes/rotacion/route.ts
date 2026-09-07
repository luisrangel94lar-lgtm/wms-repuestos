import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantUser, tenantWhere } from '@/lib/tenant'

export async function GET() {
  try {
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const productos = await db.producto.findMany({
      where: { activo: true, ...tenantWhere(user) },
      include: {
        stocks: true,
        ventaDetalles: true,
        categoria: true,
        marca: true,
      },
    })

    const rotacion = productos.map((p) => {
      const totalVendido = p.ventaDetalles.reduce((sum, d) => sum + d.cantidad, 0)
      const totalStock = p.stocks.reduce((sum, s) => sum + s.cantidad, 0)
      const inventarioPromedio = totalStock // Simple: current stock as average
      const rotacionRate = inventarioPromedio > 0 ? totalVendido / inventarioPromedio : 0

      return {
        producto: {
          id: p.id,
          sku: p.sku,
          nombre: p.nombre,
          categoria: p.categoria?.nombre ?? null,
          marca: p.marca?.nombre ?? null,
        },
        totalVendido,
        inventarioPromedio,
        rotacionRate: Math.round(rotacionRate * 100) / 100,
        stockActual: totalStock,
      }
    })

    return NextResponse.json(rotacion.sort((a, b) => b.rotacionRate - a.rotacionRate))
  } catch (error) {
    console.error('Rotacion GET error:', error)
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 })
  }
}
