import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = session.user as any
    if (user.rol !== 'super_admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const empresaId = parseInt(id, 10)

    const empresa = await db.empresa.findUnique({ where: { id: empresaId } })
    if (!empresa) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    const [totalUsuarios, totalAlmacenes, totalProductos, totalVentas, totalStock] =
      await Promise.all([
        db.usuario.count({ where: { empresaId } }),
        db.almacen.count({ where: { empresaId } }),
        db.producto.count(),
        db.venta.count({
          where: { almacen: { empresaId } },
        }),
        db.stock.aggregate({ _sum: { cantidad: true } }),
      ])

    return NextResponse.json({
      totalUsuarios,
      totalAlmacenes,
      totalProductos,
      totalVentas,
      totalStock: totalStock._sum.cantidad ?? 0,
    })
  } catch (error) {
    console.error('Empresa stats error:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
