import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantUser, tenantWhere } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const dias = parseInt(searchParams.get('dias') ?? '60', 10)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - dias)

    const productos = await db.producto.findMany({
      where: { activo: true, ...tenantWhere(user, searchParams.get('empresaId')) },
      include: {
        stocks: true,
        movimientos: {
          orderBy: { fecha: 'desc' },
          take: 1,
        },
        categoria: true,
        marca: true,
      },
    })

    const inventarioMuerto = productos
      .map((p) => {
        const totalStock = p.stocks.reduce((sum, s) => sum + s.cantidad, 0)
        const lastMovement = p.movimientos[0]
        const lastMovementDate = lastMovement?.fecha ?? null
        const daysSinceLastMovement = lastMovementDate
          ? Math.floor((Date.now() - lastMovementDate.getTime()) / (1000 * 60 * 60 * 24))
          : null
        return {
          id: p.id,
          sku: p.sku,
          nombre: p.nombre,
          categoria: p.categoria?.nombre ?? null,
          marca: p.marca?.nombre ?? null,
          totalStock,
          lastMovementDate,
          daysSinceLastMovement,
        }
      })
      .filter((p) => p.totalStock > 0 && (p.daysSinceLastMovement === null || p.daysSinceLastMovement >= dias))

    return NextResponse.json(inventarioMuerto)
  } catch (error) {
    console.error('InventarioMuerto GET error:', error)
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 })
  }
}
