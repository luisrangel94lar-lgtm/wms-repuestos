import { db } from '@/lib/db'
import crypto from 'crypto'

// License info interface
export interface LicenseInfo {
  id: number
  clave: string
  tipo: string
  estado: string
  fechaActivacion: string | null
  fechaVencimiento: string | null
  maxUsuarios: number
  diasPrueba: number
  datosEmpresa: string | null
  fechaCreacion: string
}

// License status response
export interface LicenseStatus {
  active: boolean
  type: string
  daysLeft: number
  expired: boolean
  maxUsers: number
}

// License duration by type (in days)
const LICENSE_DURATIONS: Record<string, number> = {
  trial: 30,
  mensual: 30,
  anual: 365,
  vitalicio: 36500, // ~100 years
}

// Max users by license type
const LICENSE_MAX_USERS: Record<string, number> = {
  trial: 3,
  mensual: 5,
  anual: 10,
  vitalicio: 50,
}

/**
 * Check the current license status.
 */
export async function checkLicenseStatus(): Promise<LicenseStatus> {
  const license = await db.licencia.findFirst({
    orderBy: { id: 'desc' },
  })

  if (!license) {
    return {
      active: false,
      type: 'none',
      daysLeft: 0,
      expired: true,
      maxUsers: 0,
    }
  }

  const now = new Date()
  const isExpired = Boolean(
    license.estado === 'vencida' ||
    license.estado === 'revocada' ||
    (license.fechaVencimiento && license.fechaVencimiento < now)
  )

  let daysLeft = 0
  if (license.fechaVencimiento) {
    const diffMs = license.fechaVencimiento.getTime() - now.getTime()
    daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  }

  const isActive = license.estado === 'activa' && !isExpired

  return {
    active: isActive,
    type: license.tipo,
    daysLeft,
    expired: isExpired,
    maxUsers: license.maxUsuarios,
  }
}

/**
 * Get full license info from the database.
 */
export async function getLicenseInfo(): Promise<LicenseInfo | null> {
  const license = await db.licencia.findFirst({
    orderBy: { id: 'desc' },
  })

  if (!license) return null

  return {
    id: license.id,
    clave: license.clave,
    tipo: license.tipo,
    estado: license.estado,
    fechaActivacion: license.fechaActivacion?.toISOString() ?? null,
    fechaVencimiento: license.fechaVencimiento?.toISOString() ?? null,
    maxUsuarios: license.maxUsuarios,
    diasPrueba: license.diasPrueba,
    datosEmpresa: license.datosEmpresa,
    fechaCreacion: license.fechaCreacion.toISOString(),
  }
}

/**
 * Activate a license key. Validates the key format and creates/updates the license.
 * Key format: XXXX-XXXX-XXXX-XXXX (alphanumeric, case-insensitive)
 */
export async function activateLicense(key: string): Promise<boolean> {
  // Validate key format (16 alphanumeric chars in 4 groups of 4)
  const normalizedKey = key.trim().toUpperCase()
  const keyRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/

  if (!keyRegex.test(normalizedKey)) {
    throw new Error('Formato de clave inválido. Use: XXXX-XXXX-XXXX-XXXX')
  }

  // Check if this key is already used
  const existing = await db.licencia.findUnique({
    where: { clave: normalizedKey },
  })

  if (existing) {
    // Allow re-activation of a revoked/expired license
    if (existing.estado === 'activa') {
      throw new Error('Esta licencia ya está activa.')
    }
  }

  // Determine license type from the key hash
  // Use the last character of the key to determine type
  const lastChar = normalizedKey.charAt(normalizedKey.length - 1)
  let tipo = 'mensual'
  if ('TV'.includes(lastChar)) tipo = 'trial'
  else if ('AN'.includes(lastChar)) tipo = 'anual'
  else if ('VL'.includes(lastChar)) tipo = 'vitalicio'
  else tipo = 'mensual'

  const now = new Date()
  const durationDays = LICENSE_DURATIONS[tipo] || 30
  const maxUsers = LICENSE_MAX_USERS[tipo] || 5

  const fechaVencimiento = new Date(now.getTime())
  fechaVencimiento.setDate(fechaVencimiento.getDate() + durationDays)

  if (existing) {
    // Reactivate existing license
    await db.licencia.update({
      where: { clave: normalizedKey },
      data: {
        estado: 'activa',
        tipo,
        fechaActivacion: now,
        fechaVencimiento,
        maxUsuarios: maxUsers,
      },
    })
  } else {
    // Create new license
    await db.licencia.create({
      data: {
        clave: normalizedKey,
        tipo,
        estado: 'activa',
        fechaActivacion: now,
        fechaVencimiento,
        maxUsuarios: maxUsers,
        diasPrueba: tipo === 'trial' ? durationDays : 0,
      },
    })
  }

  return true
}

/**
 * Create a trial license on first run.
 * This should be called when no license exists yet.
 */
export async function createTrialLicense(): Promise<void> {
  // Check if any license already exists
  const existingCount = await db.licencia.count()
  if (existingCount > 0) return

  // Generate a random trial key
  const segments: string[] = []
  for (let i = 0; i < 4; i++) {
    segments.push(
      crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4)
    )
  }
  const trialKey = segments.join('-')

  const now = new Date()
  const fechaVencimiento = new Date(now.getTime())
  fechaVencimiento.setDate(fechaVencimiento.getDate() + 30)

  await db.licencia.create({
    data: {
      clave: trialKey,
      tipo: 'trial',
      estado: 'activa',
      fechaActivacion: now,
      fechaVencimiento,
      maxUsuarios: 3,
      diasPrueba: 30,
    },
  })
}

/**
 * Deactivate/expire the current license.
 */
export async function revokeLicense(): Promise<void> {
  const license = await db.licencia.findFirst({
    orderBy: { id: 'desc' },
  })

  if (license) {
    await db.licencia.update({
      where: { id: license.id },
      data: { estado: 'revocada' },
    })
  }
}
