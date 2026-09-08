import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hashPassword } from '@/lib/auth-helpers'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = session.user as any
    if (user.rol !== 'super_admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    if (request.nextUrl.searchParams.get('stats') === 'true') {
      const [totalEmpresas, empresasActivas, totalAlmacenes, almacenesActivos, totalUsuarios] = await Promise.all([
        db.empresa.count(),
        db.empresa.count({ where: { activa: true } }),
        db.almacen.count(),
        db.almacen.count({ where: { activo: true } }),
        db.usuario.count({ where: { rol: { not: 'super_admin' } } }),
      ])
      return NextResponse.json({ totalEmpresas, empresasActivas, totalAlmacenes, almacenesActivos, totalUsuarios })
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
    const normalizedName = String(nombre ?? '').trim()
    const normalizedAdminName = String(adminNombre ?? '').trim()
    const normalizedAdminEmail = String(adminEmail ?? '').toLowerCase().trim()
    const normalizedNit = String(nit ?? '').trim() || null
    const validPlans = ['mensual', 'anual', 'vitalicio']

    if (!normalizedName || !normalizedAdminName || !normalizedAdminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Empresa, nombre, email y contraseña del administrador son requeridos' }, { status: 400 })
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedAdminEmail)) {
      return NextResponse.json({ error: 'El email del administrador no es válido' }, { status: 400 })
    }
    if (String(adminPassword).length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }
    if (plan && !validPlans.includes(String(plan))) {
      return NextResponse.json({ error: 'El plan seleccionado no es válido' }, { status: 400 })
    }

    const existing = await db.usuario.findUnique({ where: { email: normalizedAdminEmail } })
    if (existing) return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
    if (normalizedNit && await db.empresa.findUnique({ where: { nit: normalizedNit } })) {
      return NextResponse.json({ error: 'Ya existe una empresa con ese NIT' }, { status: 400 })
    }

    const empresa = await db.$transaction(async (tx) => {
      const created = await tx.empresa.create({
        data: {
          nombre: normalizedName, nit: normalizedNit, direccion: String(direccion ?? '').trim() || null,
          telefono: String(telefono ?? '').trim() || null, email: String(email ?? '').trim() || null, logo: logo || null,
          plan: plan ?? 'mensual',
        },
      })
      const almacen = await tx.almacen.create({
        data: { nombre: 'Principal', direccion: String(direccion ?? '').trim() || null, telefono: String(telefono ?? '').trim() || null, empresaId: created.id },
      })
      await tx.usuario.create({
        data: {
          nombre: normalizedAdminName, email: normalizedAdminEmail,
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
