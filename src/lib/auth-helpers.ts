import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const SALT_LENGTH = 16
const BCRYPT_ROUNDS = 12

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS)
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (storedHash.startsWith('$2')) {
      return bcrypt.compareSync(password, storedHash)
    }

    const [salt, hash] = storedHash.split(':')
    if (!salt || !hash) return false

    // Backwards compatibility for existing installations. Previous seed scripts
    // used scrypt while the login helper used SHA-256.
    const derived = hash.length === 128
      ? crypto.scryptSync(password, salt, 64).toString('hex')
      : crypto.createHash('sha256').update(salt + password).digest('hex')

    if (derived.length !== hash.length) return false
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'))
  } catch {
    return false
  }
}

export function needsPasswordUpgrade(storedHash: string): boolean {
  return !storedHash.startsWith('$2')
}

export function getRolePermissions(rol: string): string[] {
  const allPages = [
    'dashboard', 'products', 'equipment', 'locations', 'inventory',
    'receiving', 'sales', 'clients', 'movements', 'reports',
    'alerts', 'physicalInventory', 'settings', 'userManagement', 'license',
    'empresas', 'almacenes',
  ]

  switch (rol) {
    case 'super_admin':
      return allPages
    case 'admin':
      return allPages
    case 'gerente':
      return allPages.filter((p) => p !== 'userManagement' && p !== 'license')
    case 'vendedor':
      return ['dashboard', 'products', 'inventory', 'sales', 'clients', 'reports', 'alerts']
    case 'tecnico':
      return ['dashboard', 'products', 'equipment', 'inventory', 'alerts']
    default:
      return ['dashboard', 'alerts']
  }
}

export function hasPageAccess(rol: string, page: string): boolean {
  return getRolePermissions(rol).includes(page)
}

export function isAdmin(rol: string): boolean {
  return rol === 'admin' || rol === 'super_admin'
}

export const VALID_ROLES = ['super_admin', 'admin', 'gerente', 'vendedor', 'tecnico'] as const
export type UserRole = (typeof VALID_ROLES)[number]

export function isValidRole(rol: string): rol is UserRole {
  return VALID_ROLES.includes(rol as UserRole)
}
