import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { COMPANY_USER_ROLES, getTenantUser } from '@/lib/tenant'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const currentUser = getTenantUser(session)!
    if (!['admin', 'super_admin'].includes(currentUser.rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    const { id } = await params
    const user = await db.usuario.findFirst({
      where: { id: parseInt(id), ...(currentUser.rol === 'admin' ? { empresaId: currentUser.empresaId } : {}) },
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

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const currentUser = getTenantUser(session)!
    if (!['admin', 'super_admin'].includes(currentUser.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const targetId = parseInt(id)
    const body = await req.json()
    const { nombre, email, password, rol, activo } = body

    const target = await db.usuario.findFirst({
      where: { id: targetId, ...(currentUser.rol === 'admin' ? { empresaId: currentUser.empresaId } : {}) },
    })
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    if (currentUser.rol === 'admin' && targetId !== currentUser.id && !COMPANY_USER_ROLES.includes(target.rol as typeof COMPANY_USER_ROLES[number])) {
      return NextResponse.json({ error: 'No puede modificar administradores' }, { status: 403 })
    }
    if (currentUser.rol === 'admin' && rol !== undefined && targetId !== currentUser.id && !COMPANY_USER_ROLES.includes(rol as typeof COMPANY_USER_ROLES[number])) {
      return NextResponse.json({ error: 'Rol no permitido' }, { status: 403 })
    }
    if (targetId === currentUser.id && rol !== undefined && rol !== target.rol) {
      return NextResponse.json({ error: 'No puede cambiar su propio rol' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (nombre !== undefined) updateData.nombre = nombre
    if (email !== undefined) updateData.email = email
    if (rol !== undefined) updateData.rol = rol
    if (activo !== undefined) updateData.activo = activo
    if (password) updateData.password = await bcrypt.hash(password, 10)

    // Check email uniqueness if changing
    if (email) {
      const existing = await db.usuario.findFirst({
        where: { email, NOT: { id: targetId } },
      })
      if (existing) {
        return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
      }
    }

    const updatedUser = await db.usuario.update({
      where: { id: targetId },
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
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const currentUser = getTenantUser(session)!
    if (!['admin', 'super_admin'].includes(currentUser.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const targetId = parseInt(id)

    // Cannot delete self
    if (currentUser.id === targetId) {
      return NextResponse.json({ error: 'No puede eliminar su propia cuenta' }, { status: 400 })
    }

    const target = await db.usuario.findFirst({
      where: { id: targetId, ...(currentUser.rol === 'admin' ? { empresaId: currentUser.empresaId } : {}) },
    })
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    if (currentUser.rol === 'admin' && !COMPANY_USER_ROLES.includes(target.rol as typeof COMPANY_USER_ROLES[number])) {
      return NextResponse.json({ error: 'No puede eliminar administradores' }, { status: 403 })
    }
    await db.usuario.delete({ where: { id: targetId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
