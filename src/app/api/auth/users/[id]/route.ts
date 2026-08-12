import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'
import { isValidRole } from '@/lib/auth-helpers'
import { z } from 'zod'

const updateUserSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  rol: z.string().refine(isValidRole, 'Rol inválido').optional(),
  activo: z.boolean().optional(),
})

type RouteContext = {
  params: Promise<{ id: string }>
}

// PUT /api/auth/users/[id] — Admin only: update a user's profile
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (session.user.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden editar usuarios' },
        { status: 403 }
      )
    }

    const { id } = await context.params
    const userId = parseInt(id, 10)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Check target user exists
    const existingUser = await db.usuario.findUnique({
      where: { id: userId },
    })
    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updateData: Record<string, any> = {}
    if (parsed.data.nombre !== undefined) updateData.nombre = parsed.data.nombre
    if (parsed.data.email !== undefined) {
      // Check email uniqueness if changing
      const newEmail = parsed.data.email.toLowerCase()
      const emailTaken = await db.usuario.findFirst({
        where: { email: newEmail, id: { not: userId } },
      })
      if (emailTaken) {
        return NextResponse.json(
          { error: 'Ya existe otro usuario con ese email' },
          { status: 409 }
        )
      }
      updateData.email = newEmail
    }
    if (parsed.data.rol !== undefined) updateData.rol = parsed.data.rol
    if (parsed.data.activo !== undefined) updateData.activo = parsed.data.activo

    const updatedUser = await db.usuario.update({
      where: { id: userId },
      data: updateData,
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

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar usuario' },
      { status: 500 }
    )
  }
}

// DELETE /api/auth/users/[id] — Admin only: deactivate a user (soft delete)
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (session.user.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden desactivar usuarios' },
        { status: 403 }
      )
    }

    const { id } = await context.params
    const userId = parseInt(id, 10)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Cannot deactivate self
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'No puede desactivar su propia cuenta' },
        { status: 400 }
      )
    }

    // Check target user exists
    const existingUser = await db.usuario.findUnique({
      where: { id: userId },
    })
    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Soft delete: set activo = false
    await db.usuario.update({
      where: { id: userId },
      data: { activo: false },
    })

    return NextResponse.json({
      message: `Usuario "${existingUser.nombre}" desactivado correctamente`,
    })
  } catch (error: any) {
    console.error('Error deactivating user:', error)
    return NextResponse.json(
      { error: error.message || 'Error al desactivar usuario' },
      { status: 500 }
    )
  }
}
