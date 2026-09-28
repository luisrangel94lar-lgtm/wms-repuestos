import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { encryptSecret } from '@/lib/secret-crypto'
import { getTenantUser, resolveEmpresaId } from '@/lib/tenant'

function configured(company: { wompiPublicKey: string | null; wompiPrivateKeyEnc: string | null; wompiIntegritySecretEnc: string | null; wompiEventsSecretEnc: string | null }) {
  return Boolean(company.wompiPublicKey && company.wompiPrivateKeyEnc && company.wompiIntegritySecretEnc && company.wompiEventsSecretEnc)
}

export async function GET(request: NextRequest) {
  const user = getTenantUser(await getServerSession(authOptions))
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const empresaId = resolveEmpresaId(user, request.nextUrl.searchParams.get('empresaId'))
  if (!empresaId) return NextResponse.json({ error: 'Empresa no seleccionada' }, { status: 400 })
  const company = await db.empresa.findUnique({ where: { id: empresaId } })
  if (!company) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
  return NextResponse.json({
    enabled: configured(company),
    sandbox: company.wompiSandbox,
    publicKey: company.wompiPublicKey ?? '',
    hasPrivateKey: Boolean(company.wompiPrivateKeyEnc),
    hasIntegritySecret: Boolean(company.wompiIntegritySecretEnc),
    hasEventsSecret: Boolean(company.wompiEventsSecretEnc),
    webhookUrl: `${request.nextUrl.origin}/api/payments/wompi/webhook`,
  })
}

export async function PUT(request: NextRequest) {
  try {
    const user = getTenantUser(await getServerSession(authOptions))
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!['admin', 'super_admin'].includes(user.rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    const body = await request.json()
    const empresaId = resolveEmpresaId(user, body.empresaId)
    if (!empresaId) return NextResponse.json({ error: 'Empresa no seleccionada' }, { status: 400 })
    const sandbox = body.sandbox !== false
    const publicKey = String(body.publicKey ?? '').trim()
    if (!publicKey.startsWith(sandbox ? 'pub_test_' : 'pub_prod_')) {
      return NextResponse.json({ error: `La llave pública debe iniciar por ${sandbox ? 'pub_test_' : 'pub_prod_'}` }, { status: 400 })
    }
    const data: Record<string, unknown> = { wompiPublicKey: publicKey, wompiSandbox: sandbox }
    const secrets = [
      ['privateKey', 'wompiPrivateKeyEnc', sandbox ? 'prv_test_' : 'prv_prod_'],
      ['integritySecret', 'wompiIntegritySecretEnc', sandbox ? 'test_integrity_' : 'prod_integrity_'],
      ['eventsSecret', 'wompiEventsSecretEnc', sandbox ? 'test_events_' : 'prod_events_'],
    ] as const
    for (const [input, field, prefix] of secrets) {
      const value = String(body[input] ?? '').trim()
      if (value) {
        if (!value.startsWith(prefix)) return NextResponse.json({ error: `${input} no corresponde al ambiente seleccionado` }, { status: 400 })
        data[field] = encryptSecret(value)
      }
    }
    const company = await db.empresa.update({ where: { id: empresaId }, data })
    return NextResponse.json({ success: true, enabled: configured(company) })
  } catch (error) {
    console.error('Wompi settings PUT error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar Wompi' }, { status: 500 })
  }
}
