// Shared settings store using useSyncExternalStore with proper caching
// The getSnapshot MUST return the same reference if data hasn't changed
// to avoid infinite re-render loops

const SETTINGS_KEY = 'wms-settings'
const SETTINGS_EVENT = 'wms-settings-changed'

let cachedSettings: Record<string, unknown> = {}
let cachedRaw: string | null | undefined = '__UNINITIALIZED__'

export function subscribeSettings(callback: () => void) {
  window.addEventListener(SETTINGS_EVENT, callback)
  return () => window.removeEventListener(SETTINGS_EVENT, callback)
}

export function getSettingsSnapshot(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    // Only create new object if the raw string actually changed
    if (raw !== cachedRaw) {
      cachedRaw = raw
      cachedSettings = raw ? JSON.parse(raw) : {}
    }
  } catch {
    cachedSettings = {}
  }
  return cachedSettings
}

// Cache the server snapshot to avoid infinite loop warning
const SERVER_SNAPSHOT: Record<string, unknown> = {}

export function getSettingsServerSnapshot(): Record<string, unknown> {
  return SERVER_SNAPSHOT
}

export function updateSettings(updates: Record<string, unknown>) {
  const current = getSettingsSnapshot()
  const next = { ...current, ...updates }
  cachedRaw = JSON.stringify(next)
  cachedSettings = next
  localStorage.setItem(SETTINGS_KEY, cachedRaw)
  window.dispatchEvent(new Event(SETTINGS_EVENT))
}

// Stable subscribe for "mounted" detection - avoids inline function creation
const noopUnsubscribe = () => {}
const stableSubscribe = () => noopUnsubscribe
export { stableSubscribe }
