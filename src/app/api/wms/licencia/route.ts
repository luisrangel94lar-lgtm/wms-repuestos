import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantUser } from '@/lib/tenant'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = getTenantUser(session)!
    const licencia = await db.licencia.findFirst({
      where: user.rol === 'super_admin' ? undefined : { empresaId: user.empresaId ?? -1 },
      orderBy: { fechaCreacion: 'desc' },
    })

    return NextResponse.json(licencia)
  } catch (error) {
    console.error('Get license error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user || user.rol !== 'super_admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    const { id, estado } = await request.json()
    if (!['activa', 'revocada'].includes(estado)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    const licencia = await db.licencia.update({ where: { id: Number(id) }, data: { estado } })
    return NextResponse.json(licencia)
  } catch (error) {
    console.error('Update license error:', error)
    return NextResponse.json({ error: 'Error al actualizar licencia' }, { status: 500 })
  }
}
