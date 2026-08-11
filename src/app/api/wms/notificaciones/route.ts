import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

interface Notification {
  id: string
  type: 'alert' | 'sale' | 'receiving'
  message: string
  timestamp: string
  link: string
  extra?: Record<string, any>
}

export async function GET() {
  try {
    const notifications: Notification[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Low stock alerts: products where total stock < stockMinimo
    const lowStockProducts = await db.producto.findMany({
      where: { activo: true, stockMinimo: { gt: 0 } },
      include: {
        stocks: { select: { cantidad: true } },
        categoria: { select: { nombre: true } },
        marca: { select: { nombre: true } },
      },
    })

    for (const p of lowStockProducts) {
      const totalStock = p.stocks.reduce((s, st) => s + st.cantidad, 0)
      if (totalStock < p.stockMinimo) {
        notifications.push({
          id: `alert-${p.id}`,
          type: 'alert',
          message: `${p.nombre} — Stock: ${totalStock} (mín: ${p.stockMinimo})`,
          timestamp: new Date().toISOString(),
          link: 'alerts',
          extra: { productName: p.nombre, currentStock: totalStock, minStock: p.stockMinimo },
        })
      }
    }

    // Recent sales (last 5)
    const recentSales = await db.venta.findMany({
      take: 5,
      orderBy: { fecha: 'desc' },
      where: { estado: 'COMPLETADA' },
      include: {
        cliente: { select: { nombre: true } },
        _count: { select: { detalles: true } },
      },
    })

    for (const s of recentSales) {
      notifications.push({
        id: `sale-${s.id}`,
        type: 'sale',
        message: `Venta ${s.folio} — ${s.cliente.nombre} — $${(s.total ?? 0).toFixed(2)}`,
        timestamp: s.fecha.toISOString(),
        link: 'sales',
        extra: { folio: s.folio, total: s.total },
      })
    }

    // Recent receiving entries (last 5 ENTRADA movements)
    const recentReceiving = await db.movimiento.findMany({
      take: 5,
      orderBy: { fecha: 'desc' },
      where: { idTipo: 1 },
      include: {
        producto: { select: { nombre: true, sku: true } },
      },
    })

    for (const m of recentReceiving) {
      notifications.push({
        id: `receiving-${m.id}`,
        type: 'receiving',
        message: `Entrada: ${m.producto.nombre} +${m.cantidad}`,
        timestamp: m.fecha.toISOString(),
        link: 'receiving',
        extra: { productName: m.producto.nombre, quantity: m.cantidad },
      })
    }

    // Sort by timestamp descending, take max 20
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json(notifications.slice(0, 20))
  } catch (error) {
    console.error('Notifications error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
