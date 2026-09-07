import type { Session } from 'next-auth'

export type TenantUser = Session['user'] & {
  id: number
  rol: string
  empresaId?: number | null
  almacenId?: number | null
}

export function getTenantUser(session: Session | null): TenantUser | null {
  return session?.user ? session.user as TenantUser : null
}

export function resolveEmpresaId(user: TenantUser, requested?: unknown): number | null {
  if (user.rol !== 'super_admin') return user.empresaId ?? null
  const parsed = Number(requested)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function tenantWhere(user: TenantUser, requested?: unknown): { empresaId?: number } {
  const empresaId = resolveEmpresaId(user, requested)
  return empresaId ? { empresaId } : {}
}

export function canManageCatalog(user: TenantUser): boolean {
  return user.rol === 'super_admin' || user.rol === 'admin'
}

export const COMPANY_USER_ROLES = ['gerente', 'cajero', 'vendedor', 'tecnico'] as const

