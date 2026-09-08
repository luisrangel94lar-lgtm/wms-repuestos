import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { COMPANY_USER_ROLES, getTenantUser, resolveEmpresaId } from '@/lib/tenant'
import { isValidRole } from '@/lib/auth-helpers'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = getTenantUser(session)!
    if (!['admin', 'super_admin'].includes(user.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const url = new URL(req.url)
    const countOnly = url.searchParams.get('count') === '1'

    // Role-based filtering
    const where: Record<string, unknown> = {}
    if (user.rol === 'admin' && user.empresaId) {
      where.empresaId = user.empresaId
    }

    if (countOnly) {
      const count = await db.usuario.count({ where })
      return NextResponse.json({ count })
    }

    const users = await db.usuario.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        ultimoAcceso: true,
        fechaCreacion: true,
        empresaId: true,
        almacenId: true,
        almacen: { select: { id: true, nombre: true } },
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

    const user = getTenantUser(session)!
    if (!['admin', 'super_admin'].includes(user.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const { nombre, email, password, rol = 'cajero', activo } = body

    if (!nombre || !email || !password) {
      return NextResponse.json({ error: 'Nombre, email y contraseña son obligatorios' }, { status: 400 })
    }
    if (!isValidRole(rol)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    if (user.rol === 'admin' && !COMPANY_USER_ROLES.includes(rol as typeof COMPANY_USER_ROLES[number])) {
      return NextResponse.json({ error: 'El administrador de empresa solo puede crear personal operativo' }, { status: 403 })
    }

    const empresaId = resolveEmpresaId(user, body.empresaId)
    if (!empresaId) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 })

    if (!body.almacenId) return NextResponse.json({ error: 'Debe asignar un almacén al usuario' }, { status: 400 })
    const almacen = await db.almacen.findFirst({ where: { id: Number(body.almacenId), empresaId, activo: true } })
    if (!almacen) return NextResponse.json({ error: 'El almacén no pertenece a la empresa' }, { status: 400 })

    // Check if email exists
    const existing = await db.usuario.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
    }

    // Check license user limit
    const licencia = await db.licencia.findFirst({
      where: { estado: 'activa', empresaId },
      orderBy: { fechaCreacion: 'desc' },
    })
    if (licencia) {
      const userCount = await db.usuario.count({ where: { empresaId, activo: true } })
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
        rol,
        activo: activo !== false,
        creadoPor: Number(user.id),
        empresaId,
        almacenId: Number(body.almacenId),
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        ultimoAcceso: true,
        fechaCreacion: true,
        empresaId: true,
        almacenId: true,
        almacen: { select: { id: true, nombre: true } },
      },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
