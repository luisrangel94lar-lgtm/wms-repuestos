import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { clave } = await req.json()

    if (!clave || typeof clave !== 'string' || clave.trim().length < 8) {
      return NextResponse.json({ error: 'Clave de licencia inválida' }, { status: 400 })
    }

    // Check if key is already used or find it
    const existing = await db.licencia.findFirst({
      where: { clave: clave.trim() },
    })

    if (existing) {
      if (existing.estado === 'activa') {
        return NextResponse.json({ error: 'Esta licencia ya está activa' }, { status: 400 })
      }
      // Reactivate
      const now = new Date()
      let fechaVencimiento: Date | null = null
      if (existing.tipo === 'mensual') {
        fechaVencimiento = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      } else if (existing.tipo === 'anual') {
        fechaVencimiento = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      }
      // vitalicio has no expiration

      const updated = await db.licencia.update({
        where: { id: existing.id },
        data: {
          estado: 'activa',
          fechaActivacion: now,
          fechaVencimiento,
        },
      })
      return NextResponse.json(updated)
    }

    // Create a new license record (for demo/key-based activation)
    const now = new Date()
    // Determine type from key format (simplified: starts with T=trial, M=monthly, A=annual, V=lifetime)
    const keyUpper = clave.trim().toUpperCase()
    let tipo = 'anual'
    let maxUsuarios = 10
    if (keyUpper.startsWith('T')) {
      tipo = 'trial'
      maxUsuarios = 3
    } else if (keyUpper.startsWith('M')) {
      tipo = 'mensual'
      maxUsuarios = 5
    } else if (keyUpper.startsWith('V')) {
      tipo = 'vitalicio'
      maxUsuarios = 99
    } else if (keyUpper.startsWith('A')) {
      tipo = 'anual'
      maxUsuarios = 10
    }

    let fechaVencimiento: Date | null = null
    if (tipo === 'trial') {
      fechaVencimiento = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    } else if (tipo === 'mensual') {
      fechaVencimiento = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    } else if (tipo === 'anual') {
      fechaVencimiento = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
    }

    const licencia = await db.licencia.create({
      data: {
        clave: clave.trim(),
        tipo,
        estado: 'activa',
        fechaActivacion: now,
        fechaVencimiento,
        maxUsuarios,
        diasPrueba: tipo === 'trial' ? 30 : 0,
      },
    })

    return NextResponse.json(licencia)
  } catch (error) {
    console.error('Activate license error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
