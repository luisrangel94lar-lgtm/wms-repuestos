import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

// GET /api/auth/users — Admin only: list all users (without passwords)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (session.user.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden ver usuarios' },
        { status: 403 }
      )
    }

    const users = await db.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        ultimoAcceso: true,
        fechaCreacion: true,
        creadoPor: true,
        creador: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    )
  }
}
