import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as any
    if (user.rol !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const url = new URL(req.url)
    const countOnly = url.searchParams.get('count') === '1'

    if (countOnly) {
      const count = await db.usuario.count()
      return NextResponse.json({ count })
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
      },
      orderBy: { fechaCreacion: 'asc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as any
    if (user.rol !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const { nombre, email, password, rol, activo } = body

    if (!nombre || !email || !password) {
      return NextResponse.json({ error: 'Nombre, email y contraseña son obligatorios' }, { status: 400 })
    }

    // Check if email exists
    const existing = await db.usuario.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
    }

    // Check license user limit
    const licencia = await db.licencia.findFirst({
      where: { estado: 'activa' },
      orderBy: { fechaCreacion: 'desc' },
    })
    if (licencia) {
      const userCount = await db.usuario.count()
      if (userCount >= licencia.maxUsuarios) {
        return NextResponse.json({ error: `Límite de usuarios alcanzado (${licencia.maxUsuarios})` }, { status: 400 })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await db.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol: rol || 'tecnico',
        activo: activo !== false,
        creadoPor: user.id,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        ultimoAcceso: true,
        fechaCreacion: true,
      },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
