'use client'

import { useRef, useEffect, useState, useCallback, useSyncExternalStore } from 'react'
import { subscribeSettings, getSettingsSnapshot, stableSubscribe } from '@/lib/settings-store'
import { useQuery } from '@tanstack/react-query'
import { useWmsStore } from '@/store/wms'
import { pageTitles } from './WmsSidebar'
import { SearchResults } from './SearchResults'
import { Menu, Search, X, Sun, Moon, ChevronRight, ChevronDown, Bell, AlertTriangle, ShoppingCart, Download, CheckCheck, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import type { WmsPage } from '@/types/wms'
import { cn } from '@/lib/utils'
import { KeyboardShortcutsDialog } from './KeyboardShortcuts'

const breadcrumbs: Record<WmsPage, { path: string; description: string }> = {
  dashboard: { path: 'Inicio', description: 'Resumen general del almacén y métricas clave' },
  products: { path: 'Catálogo / Productos', description: 'Catálogo completo de productos con precios y stock' },
  equipment: { path: 'Catálogo / Equipos', description: 'Modelos de equipos y compatibilidad con repuestos' },
  receiving: { path: 'Operaciones / Recepción', description: 'Entrada de mercancía y actualización de inventario' },
  sales: { path: 'Operaciones / Ventas', description: 'Registro de ventas a técnicos con tracking de stock' },
  inventory: { path: 'Operaciones / Inventario', description: 'Vista consolidada del inventario actual' },
  locations: { path: 'Operaciones / Ubicaciones', description: 'Mapa visual del almacén con stock por ubicación' },
  clients: { path: 'Clientes', description: 'Directorio de clientes técnicos' },
  movements: { path: 'Movimientos', description: 'Historial de movimientos de inventario y kardex' },
  reports: { path: 'Reportes', description: 'Reportes operativos y estadísticas de rendimiento' },
  alerts: { path: 'Alertas', description: 'Productos que requieren reabastecimiento urgente' },
  settings: { path: 'Sistema / Configuración', description: 'Preferencias del sistema y datos del almacén' },
  physicalInventory: { path: 'Operaciones / Inventario Físico', description: 'Conteo físico del inventario con detección de varianzas' },
  userManagement: { path: 'Sistema / Usuarios', description: 'Administración de usuarios y permisos' },
  license: { path: 'Sistema / Licencia', description: 'Gestión de licencias del sistema' },
  empresas: { path: 'Super Admin / Empresas', description: 'Gestión de empresas registradas en el sistema' },
  almacenes: { path: 'Super Admin / Almacenes', description: 'Gestión de almacenes por empresa' },
}

interface NotificationItem {
  id: string
  type: 'alert' | 'sale' | 'receiving'
  message: string
  timestamp: string
  link: string
}

const STORAGE_KEY = 'wms-notifications-seen'

function getSeenIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setSeenIds(ids: string[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}

function timeAgo(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `Hace ${diffMin}m`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `Hace ${diffHrs}h`
  const diffDays = Math.floor(diffHrs / 24)
  return `Hace ${diffDays}d`
}

const pageMapping: Record<string, WmsPage> = {
  '1': 'dashboard',
  '2': 'products',
  '3': 'equipment',
  '4': 'receiving',
  '5': 'sales',
  '6': 'inventory',
  '7': 'movements',
  '8': 'reports',
  '9': 'alerts',
}

export function WmsHeader() {
  const { currentPage, toggleSidebar, searchQuery, setSearchQuery, setCurrentPage, session } = useWmsStore()
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [showResults, setShowResults] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [seenIds, setSeenIdsState] = useState<string[]>(() => getSeenIds())
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const mounted = useSyncExternalStore(stableSubscribe, () => true, () => false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()

  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const r = await fetch('/api/wms/notificaciones')
        if (!r.ok) return []
        const data = await r.json()
        return Array.isArray(data) ? data : []
      } catch {
        return []
      }
    },
    refetchInterval: 60000,
  })

  const unreadCount = Array.isArray(notifications) ? notifications.filter((n) => !seenIds.includes(n.id)).length : 0

  function markAllSeen() {
    const allIds = Array.isArray(notifications) ? notifications.map((n) => n.id) : []
    setSeenIds(allIds)
    setSeenIdsState(allIds)
  }

  function handleNotifClick(notif: NotificationItem) {
    setCurrentPage(notif.link as WmsPage)
    setNotifOpen(false)
    if (!seenIds.includes(notif.id)) {
      const updated = [...seenIds, notif.id]
      setSeenIdsState(updated)
      setSeenIds(updated)
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localQuery)
      setShowResults(localQuery.length >= 2)
    }, 300)
    return () => clearTimeout(timer)
  }, [localQuery, setSearchQuery])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      inputRef.current?.focus()
      return
    }
    // Ctrl+1-9 navigation
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
      e.preventDefault()
      const page = pageMapping[e.key]
      if (page) setCurrentPage(page)
      return
    }
    // ? key opens shortcuts (only when not typing in an input)
    if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
      const tag = (e.target as HTMLElement).tagName
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault()
        setShortcutsOpen(true)
      }
    }
  }, [setCurrentPage])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  function handleClear() {
    setLocalQuery('')
    setSearchQuery('')
    setShowResults(false)
    inputRef.current?.focus()
  }

  const crumb = breadcrumbs[currentPage]
  const pathParts = crumb.path.split(' / ')

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Emerald-to-teal gradient top accent bar (2px) */}
      <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shrink-0" />

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <h1 className="text-lg font-semibold hidden sm:block">
          {pageTitles[currentPage]}
        </h1>

        <div className="flex-1" />

        {/* Search bar with glow on focus */}
        <div ref={containerRef} className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-colors" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="Buscar productos, equipos... (Ctrl+K)"
            className={cn(
              'pl-9 pr-9 h-9 rounded-full border transition-all duration-200',
              searchFocused
                ? 'ring-2 ring-primary/30 border-primary/40 shadow-[0_0_12px_oklch(0.55_0.15_160/12%)]'
                : 'hover:border-primary/25'
            )}
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onFocus={() => {
              setSearchFocused(true)
              if (localQuery.length >= 2) setShowResults(true)
            }}
            onBlur={() => setSearchFocused(false)}
          />
          {localQuery.length > 0 && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {showResults && (
            <SearchResults
              query={localQuery}
              onSelect={() => {
                setShowResults(false)
                setLocalQuery('')
                setSearchQuery('')
                inputRef.current?.blur()
              }}
            />
          )}
        </div>

        {/* Notification bell */}
        <div ref={notifRef} className="relative shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 relative"
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="Notificaciones"
          >
            <Bell className={cn('h-4 w-4 transition-colors', notifOpen && 'text-primary')} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 rounded-xl border bg-popover shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="text-sm font-semibold">Notificaciones</h3>
                {unreadCount > 0 && (
                  <button
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                    onClick={markAllSeen}
                  >
                    <CheckCheck className="h-3 w-3" />
                    Marcar como leídas
                  </button>
                )}
              </div>
              <ScrollArea className="max-h-80">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Sin notificaciones</p>
                  </div>
                ) : (
                  <div>
                    {notifications.map((notif) => {
                      const isUnread = !seenIds.includes(notif.id)
                      const iconMap = {
                        alert: <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />,
                        sale: <ShoppingCart className="h-4 w-4 text-emerald-500 shrink-0" />,
                        receiving: <Download className="h-4 w-4 text-amber-500 shrink-0" />,
                      }
                      return (
                        <button
                          key={notif.id}
                          className={cn(
                            'w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-accent/50 transition-colors border-b last:border-b-0',
                            isUnread && 'bg-primary/5'
                          )}
                          onClick={() => handleNotifClick(notif)}
                        >
                          <div className="mt-0.5">
                            {iconMap[notif.type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-xs leading-relaxed', isUnread && 'font-medium')}>{notif.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(notif.timestamp)}</p>
                          </div>
                          {isUnread && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Help / Keyboard Shortcuts */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={() => setShortcutsOpen(true)}
          aria-label="Atajos de teclado"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>

        <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Cambiar tema"
        >
          {mounted && (
            <>
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </>
          )}
          {!mounted && <div className="h-4 w-4" />}
        </Button>

        {/* User avatar with hover glow */}
        <div ref={avatarRef} className="relative shrink-0">
          <button
            onClick={() => setAvatarOpen(!avatarOpen)}
            className={cn(
              'flex items-center gap-1.5 h-9 px-1.5 rounded-lg transition-all duration-200',
              avatarOpen
                ? 'bg-primary/10 shadow-[0_0_10px_oklch(0.55_0.15_160/15%)]'
                : 'hover:bg-accent hover:shadow-[0_0_8px_oklch(0.55_0.15_160/8%)]'
            )}
          >
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm shadow-primary/30">
              A
            </div>
            <span className="hidden sm:inline text-sm font-medium">Admin</span>
            {session?.user?.empresaId && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 ml-1">
                Empresa #{session.user.empresaId}
              </Badge>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {avatarOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 rounded-lg border bg-popover p-1 shadow-lg z-50">
              <div className="px-3 py-2 border-b mb-1">
                <p className="text-sm font-medium">Admin</p>
                <p className="text-xs text-muted-foreground">admin@wms.local</p>
              </div>
              <button
                className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors"
                onClick={() => { setCurrentPage('settings'); setAvatarOpen(false) }}
              >
                Configuración
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors"
                onClick={() => { toast.info('Sesión cerrada (demo)'); setAvatarOpen(false) }}
              >
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Breadcrumbs with chevron separators */}
      <div className="px-4 md:px-6 pb-2 flex flex-col gap-0.5">
        <nav className="flex items-center gap-1 text-xs" aria-label="Breadcrumb">
          {pathParts.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
              <span
                className={cn(
                  'transition-colors',
                  i === pathParts.length - 1
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground/70'
                )}
              >
                {part}
              </span>
            </span>
          ))}
        </nav>
        <p className="text-[11px] text-muted-foreground/80 truncate max-w-lg">{crumb.description}</p>
      </div>
    </header>
  )
}
