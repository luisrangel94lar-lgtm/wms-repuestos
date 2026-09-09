import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth-helpers'
import { z } from 'zod'

const registrationSchema = z.object({
  token: z.string().min(20).max(100),
  empresaNombre: z.string().trim().min(2).max(120),
  nit: z.string().trim().max(40).optional(),
  direccion: z.string().trim().max(180).optional(),
  telefono: z.string().trim().max(40).optional(),
  empresaEmail: z.string().trim().email().optional().or(z.literal('')),
  adminNombre: z.string().trim().min(2).max(100),
  adminEmail: z.string().trim().email(),
  password: z.string().min(8).max(128),
})

const PLAN_DAYS: Record<string, number> = { trial: 30, mensual: 30, anual: 365, vitalicio: 36500 }

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? ''
  const invitation = await db.licencia.findFirst({
    where: {
      clave: token,
      estado: 'invitacion',
      empresaId: null,
      fechaVencimiento: { gt: new Date() },
    },
    select: { tipo: true, fechaVencimiento: true },
  })

  if (!invitation) {
    return NextResponse.json({ valid: false, error: 'El enlace es inválido, ya fue utilizado o venció' }, { status: 404 })
  }

  return NextResponse.json({ valid: true, plan: invitation.tipo, expiresAt: invitation.fechaVencimiento })
}

export async function POST(request: NextRequest) {
  try {
    const parsed = registrationSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Revisa los datos obligatorios del registro' }, { status: 400 })
    }

    const data = parsed.data
    const normalizedEmail = data.adminEmail.toLowerCase()
    const normalizedNit = data.nit || null

    if (await db.usuario.findUnique({ where: { email: normalizedEmail } })) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
    }
    if (normalizedNit && await db.empresa.findUnique({ where: { nit: normalizedNit } })) {
      return NextResponse.json({ error: 'Ya existe una empresa con ese NIT' }, { status: 409 })
    }

    const result = await db.$transaction(async (tx) => {
      const claimed = await tx.licencia.updateMany({
        where: {
          clave: data.token,
          estado: 'invitacion',
          empresaId: null,
          fechaVencimiento: { gt: new Date() },
        },
        data: { estado: 'procesando' },
      })
      if (claimed.count !== 1) throw new Error('INVITATION_UNAVAILABLE')

      const invitation = await tx.licencia.findUniqueOrThrow({ where: { clave: data.token } })
      const empresa = await tx.empresa.create({
        data: {
          nombre: data.empresaNombre,
          nit: normalizedNit,
          direccion: data.direccion || null,
          telefono: data.telefono || null,
          email: data.empresaEmail || null,
          plan: invitation.tipo,
        },
      })
      const almacen = await tx.almacen.create({
        data: {
          nombre: 'Principal',
          direccion: data.direccion || null,
          telefono: data.telefono || null,
          empresaId: empresa.id,
        },
      })
      await tx.usuario.create({
        data: {
          nombre: data.adminNombre,
          email: normalizedEmail,
          password: hashPassword(data.password),
          rol: 'admin',
          activo: true,
          empresaId: empresa.id,
          almacenId: almacen.id,
          creadoPor: null,
        },
      })

      const activatedAt = new Date()
      const expiresAt = new Date(activatedAt)
      expiresAt.setDate(expiresAt.getDate() + (PLAN_DAYS[invitation.tipo] ?? 30))
      await tx.licencia.update({
        where: { id: invitation.id },
        data: {
          estado: 'activa',
          empresaId: empresa.id,
          fechaActivacion: activatedAt,
          fechaVencimiento: expiresAt,
          datosEmpresa: JSON.stringify({ nombre: empresa.nombre, nit: empresa.nit }),
        },
      })

      return { empresaId: empresa.id }
    })

    return NextResponse.json({ success: true, ...result }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'INVITATION_UNAVAILABLE') {
      return NextResponse.json({ error: 'El enlace es inválido, ya fue utilizado o venció' }, { status: 409 })
    }
    console.error('Public company registration error:', error)
    return NextResponse.json({ error: 'No se pudo completar el registro' }, { status: 500 })
  }
}

