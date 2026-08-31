import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? ''
    if (!q.trim()) {
      return NextResponse.json([])
    }

    const [productos, equipos] = await Promise.all([
      db.producto.findMany({
        where: {
          OR: [
            { sku: { contains: q } },
            { nombre: { contains: q } },
          ],
        },
        include: { marca: true },
        take: 20,
      }),
      db.equipo.findMany({
        where: {
          OR: [
            { modelo: { contains: q } },
            { marca: { nombre: { contains: q } } },
          ],
        },
        include: { marca: true },
        take: 20,
      }),
    ])

    const results = [
      ...productos.map((p) => ({
        type: 'producto' as const,
        id: p.id,
        sku: p.sku,
        nombre: p.nombre,
        subtext: p.marca?.nombre ?? p.descripcion ?? '',
      })),
      ...equipos.map((e) => ({
        type: 'equipo' as const,
        id: e.id,
        nombre: e.modelo,
        subtext: e.marca?.nombre ?? '',
      })),
    ]

    return NextResponse.json(results)
  } catch (error) {
    console.error('Busqueda GET error:', error)
    return NextResponse.json({ error: 'Error en búsqueda' }, { status: 500 })
  }
}
