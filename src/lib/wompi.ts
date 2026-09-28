import { createHash, timingSafeEqual } from 'crypto'
import { decryptSecret } from './secret-crypto'

export type WompiCompanyConfig = {
  wompiPublicKey: string | null
  wompiPrivateKeyEnc: string | null
  wompiIntegritySecretEnc: string | null
  wompiEventsSecretEnc: string | null
  wompiSandbox: boolean
}

export function getWompiConfig(company: WompiCompanyConfig) {
  if (!company.wompiPublicKey || !company.wompiPrivateKeyEnc || !company.wompiIntegritySecretEnc || !company.wompiEventsSecretEnc) {
    throw new Error('Wompi no está configurado completamente para esta empresa')
  }
  return {
    publicKey: company.wompiPublicKey,
    privateKey: decryptSecret(company.wompiPrivateKeyEnc),
    integritySecret: decryptSecret(company.wompiIntegritySecretEnc),
    eventsSecret: decryptSecret(company.wompiEventsSecretEnc),
    sandbox: company.wompiSandbox,
  }
}

export function wompiApiBase(sandbox: boolean) {
  return sandbox ? 'https://sandbox.wompi.co/v1' : 'https://production.wompi.co/v1'
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function createIntegritySignature(reference: string, amountInCents: number, currency: string, secret: string) {
  return sha256(`${reference}${amountInCents}${currency}${secret}`)
}

export function buildCheckoutUrl(input: {
  publicKey: string
  reference: string
  amountInCents: number
  currency: string
  integritySecret: string
  redirectUrl: string
}) {
  const params = new URLSearchParams({
    'public-key': input.publicKey,
    currency: input.currency,
    'amount-in-cents': String(input.amountInCents),
    reference: input.reference,
    'signature:integrity': createIntegritySignature(input.reference, input.amountInCents, input.currency, input.integritySecret),
    'redirect-url': input.redirectUrl,
  })
  return `https://checkout.wompi.co/p/?${params.toString()}`
}

function valueAtPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined
    return (value as Record<string, unknown>)[key]
  }, source)
}

export function validateEventSignature(body: Record<string, any>, eventsSecret: string) {
  const properties = body.signature?.properties
  const checksum = body.signature?.checksum
  const timestamp = body.timestamp
  if (!Array.isArray(properties) || typeof checksum !== 'string' || timestamp === undefined) return false
  const values = properties.map((path: string) => valueAtPath(body.data, path))
  if (values.some((value: unknown) => value === undefined || value === null)) return false
  const expected = sha256(`${values.join('')}${timestamp}${eventsSecret}`)
  const receivedBuffer = Buffer.from(checksum.toLowerCase())
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

export async function fetchWompiTransaction(id: string, privateKey: string, sandbox: boolean) {
  const response = await fetch(`${wompiApiBase(sandbox)}/transactions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${privateKey}` },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Wompi rechazó la verificación (${response.status})`)
  const payload = await response.json()
  return payload.data as { id: string; status: string; reference: string; amount_in_cents: number; currency: string }
}
