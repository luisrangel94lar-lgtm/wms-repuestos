import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

// POST /api/wms/licencia/generar — Admin only: generate a new license key
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = session.user as any
    if (user.rol !== 'super_admin') {
      return NextResponse.json({ error: 'Solo el superadministrador puede generar licencias' }, { status: 403 })
    }

    const { tipo, diasPrueba, notas, datosEmpresa, empresaId } = await req.json()

    const validTypes = ['trial', 'mensual', 'anual', 'vitalicio']
    if (!tipo || !validTypes.includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de licencia inválido. Use: trial, mensual, anual, vitalicio' }, { status: 400 })
    }
    if (!empresaId || !(await db.empresa.findUnique({ where: { id: Number(empresaId) } }))) {
      return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 })
    }

    // Generate a license key based on type prefix + random
    const prefixMap: Record<string, string> = {
      trial: 'T',
      mensual: 'M',
      anual: 'A',
      vitalicio: 'V',
    }
    const prefix = prefixMap[tipo] || 'M'
    const segments: string[] = []
    for (let i = 0; i < 3; i++) {
      segments.push(crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4))
    }
    const key = `${prefix}${crypto.randomBytes(1).toString('hex').toUpperCase()}-${segments.join('-')}`

    // Duration and max users
    const durationDays: Record<string, number> = { trial: 30, mensual: 30, anual: 365, vitalicio: 36500 }
    const maxUsers: Record<string, number> = { trial: 3, mensual: 5, anual: 10, vitalicio: 50 }

    const days = diasPrueba || durationDays[tipo]
    const licencia = await db.licencia.create({
      data: {
        clave: key,
        tipo,
        estado: 'pendiente', // pending activation
        maxUsuarios: maxUsers[tipo],
        diasPrueba: tipo === 'trial' ? days : 0,
        notas: notas || null,
        datosEmpresa: datosEmpresa ? JSON.stringify(datosEmpresa) : null,
        empresaId: Number(empresaId),
      },
    })

    return NextResponse.json({
      clave: licencia.clave,
      tipo: licencia.tipo,
      maxUsuarios: licencia.maxUsuarios,
      estado: licencia.estado,
    }, { status: 201 })
  } catch (error) {
    console.error('Generate license error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
