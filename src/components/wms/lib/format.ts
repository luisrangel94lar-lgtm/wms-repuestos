const CURRENCY_CONFIG: Record<string, { locale: string; code: string; decimals: number }> = {
  COP: { locale: 'es-CO', code: 'COP', decimals: 0 },
  MXN: { locale: 'es-MX', code: 'MXN', decimals: 2 },
  USD: { locale: 'en-US', code: 'USD', decimals: 2 },
  EUR: { locale: 'de-DE', code: 'EUR', decimals: 2 },
  BRL: { locale: 'pt-BR', code: 'BRL', decimals: 2 },
}

const STORAGE_KEY = 'wms-settings'

function getCurrency(): string {
  if (typeof window === 'undefined') return 'COP'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const settings = JSON.parse(raw)
      if (settings.moneda && CURRENCY_CONFIG[settings.moneda]) return settings.moneda
    }
  } catch {
    // ignore
  }
  return 'COP'
}

export function formatCurrency(value: number): string {
  const currency = getCurrency()
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.COP
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(value)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const tipoMovColors: Record<string, string> = {
  ENTRADA: 'badge-teal',
  SALIDA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  AJUSTE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  TRASLADO: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  DEVOLUCION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}
