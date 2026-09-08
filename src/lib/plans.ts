export const WAREHOUSE_LIMITS_BY_PLAN: Record<string, number> = {
  trial: 1,
  mensual: 1,
  anual: 5,
  vitalicio: 10,
}

export function getWarehouseLimit(plan: string | null | undefined): number {
  return WAREHOUSE_LIMITS_BY_PLAN[String(plan ?? 'mensual').toLowerCase()] ?? WAREHOUSE_LIMITS_BY_PLAN.mensual
}

