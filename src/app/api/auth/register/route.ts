import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'
import { hashPassword, isValidRole } from '@/lib/auth-helpers'
import { z } from 'zod'

const registerSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(128),
  rol: z.string().refine(isValidRole, 'Rol inválido'),
})

// POST /api/auth/register — Admin only: create a new user
export async function POST(request: NextRequest) {
  try {
    // Verify the caller is authenticated and is an admin
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (session.user.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden crear usuarios' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { nombre, email, password, rol } = parsed.data

    // Check if email already exists
    const existingUser = await db.usuario.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email' },
        { status: 409 }
      )
    }

    // Hash the password
    const hashedPassword = hashPassword(password)

    // Create the user
    const newUser = await db.usuario.create({
      data: {
        nombre,
        email: email.toLowerCase(),
        password: hashedPassword,
        rol,
        activo: true,
        creadoPor: session.user.id,
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
  } catch (error: any) {
    console.error('Error registering user:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear usuario' },
      { status: 500 }
    )
  }
}
