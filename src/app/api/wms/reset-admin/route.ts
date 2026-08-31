import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

// GET /api/wms/reset-admin — Create or reset admin password
export async function GET() {
  try {
    let admin = await db.usuario.findUnique({ where: { email: 'admin@almacen.com' } })

    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.createHash('sha256').update(salt + 'admin123').digest('hex')
    const hashedPassword = salt + ':' + hash

    if (!admin) {
      // Create admin user if it doesn't exist
      admin = await db.usuario.create({
        data: {
          nombre: 'Administrador',
          email: 'admin@almacen.com',
          password: hashedPassword,
          rol: 'admin',
          activo: true,
        },
      })
      return NextResponse.json({ ok: true, message: 'Usuario admin creado con password admin123' })
    }

    // Update password if user exists
    await db.usuario.update({
      where: { email: 'admin@almacen.com' },
      data: { password: hashedPassword },
    })
    return NextResponse.json({ ok: true, message: 'Password restaurado a admin123' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
