import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/wms/diagnostico — Check system status
export async function GET() {
  try {
    const checks: Record<string, string | boolean> = {}

    // Check environment
    checks.database_url = process.env.DATABASE_URL ? 'OK' : 'FALTANTE'
    checks.nextauth_secret = process.env.NEXTAUTH_SECRET ? 'OK' : 'FALTANTE'
    checks.nextauth_url = process.env.NEXTAUTH_URL ? process.env.NEXTAUTH_URL : 'FALTANTE'

    // Check database tables
    try {
      await db.usuario.count()
      checks.tabla_usuarios = 'OK'
    } catch { checks.tabla_usuarios = 'NO EXISTE - ejecutar: bun run db:push' }

    try {
      await db.licencia.count()
      checks.tabla_licencias = 'OK'
    } catch { checks.tabla_licencias = 'NO EXISTE - ejecutar: bun run db:push' }

    // Check admin user
    try {
      const admin = await db.usuario.findUnique({ where: { email: 'admin@almacen.com' } })
      checks.admin_user = admin ? 'OK' : 'NO EXISTE - ir a: /api/wms/reset-admin'
    } catch { checks.admin_user = 'ERROR' }

    // Check license
    try {
      const lic = await db.licencia.findFirst()
      checks.licencia = lic ? 'OK (' + lic.tipo + ')' : 'NO EXISTE'
    } catch { checks.licencia = 'ERROR' }

    // Count
    try {
      const userCount = await db.usuario.count()
      checks.total_usuarios = userCount
    } catch { checks.total_usuarios = 'ERROR' }

    return NextResponse.json(checks)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 })
  }
}
