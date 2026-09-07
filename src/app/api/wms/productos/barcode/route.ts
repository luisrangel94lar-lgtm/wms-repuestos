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
    const barcode = searchParams.get('barcode')?.trim()

    if (!barcode) {
      return NextResponse.json({ error: 'Parámetro barcode requerido' }, { status: 400 })
    }

    const producto = await db.producto.findFirst({
      where: { codigoBarras: barcode, activo: true, ...tenantWhere(user, searchParams.get('empresaId')) },
      include: {
        categoria: { select: { id: true, nombre: true } },
        marca: { select: { id: true, nombre: true } },
        stocks: {
          where: { cantidad: { gt: 0 } },
          include: {
            ubicacion: { select: { id: true, pasillo: true, estante: true, nivel: true } },
          },
        },
      },
    })

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const totalStock = producto.stocks.reduce((sum, s) => sum + s.cantidad, 0)

    return NextResponse.json({
      ...producto,
      totalStock,
    })
  } catch (error) {
    console.error('Barcode lookup error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
