import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hashPassword } from '@/lib/auth-helpers'
import crypto from 'crypto'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = session.user as any
    if (user.rol !== 'super_admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const empresas = await db.empresa.findMany({
      include: {
        licencias: { orderBy: { fechaCreacion: 'desc' }, take: 1 },
        _count: {
          select: {
            usuarios: true,
            almacenes: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json(empresas)
  } catch (error) {
    console.error('Empresas GET error:', error)
    return NextResponse.json({ error: 'Error al obtener empresas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = session.user as any
    if (user.rol !== 'super_admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, nit, direccion, telefono, email, logo, plan, adminNombre, adminEmail, adminPassword } = body

    if (!nombre || !adminNombre || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Empresa, nombre, email y contraseña del administrador son requeridos' }, { status: 400 })
    }
    if (String(adminPassword).length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    const existing = await db.usuario.findUnique({ where: { email: String(adminEmail).toLowerCase().trim() } })
    if (existing) return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })

    const empresa = await db.$transaction(async (tx) => {
      const created = await tx.empresa.create({
        data: {
          nombre: String(nombre).trim(), nit: nit || null, direccion: direccion || null,
          telefono: telefono || null, email: email || null, logo: logo || null,
          plan: plan ?? 'mensual',
        },
      })
      const almacen = await tx.almacen.create({
        data: { nombre: 'Principal', direccion: direccion || null, telefono: telefono || null, empresaId: created.id },
      })
      await tx.usuario.create({
        data: {
          nombre: String(adminNombre).trim(), email: String(adminEmail).toLowerCase().trim(),
          password: hashPassword(String(adminPassword)), rol: 'admin', empresaId: created.id,
          almacenId: almacen.id, creadoPor: user.id,
        },
      })
      const expires = new Date()
      expires.setDate(expires.getDate() + 30)
      await tx.licencia.create({
        data: {
          clave: crypto.randomUUID(), tipo: 'trial', estado: 'activa', fechaActivacion: new Date(),
          fechaVencimiento: expires, diasPrueba: 30, maxUsuarios: 3, empresaId: created.id,
        },
      })
      return created
    })

    return NextResponse.json(empresa, { status: 201 })
  } catch (error: unknown) {
    console.error('Empresas POST error:', error)
    const msg = error instanceof Error ? error.message : 'Error al crear empresa'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
