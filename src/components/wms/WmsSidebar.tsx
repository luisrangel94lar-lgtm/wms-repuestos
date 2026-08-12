'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useWmsStore } from '@/store/wms'
import type { WmsPage } from '@/types/wms'
import {
  LayoutDashboard,
  Package,
  Cpu,
  Download,
  ShoppingCart,
  Warehouse,
  MapPin,
  Users,
  ArrowLeftRight,
  BarChart3,
  AlertTriangle,
  ClipboardCheck,
  Settings,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency } from './lib/format'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useQuery } from '@tanstack/react-query'
import { subscribeSettings, getSettingsSnapshot, getSettingsServerSnapshot } from '@/lib/settings-store'

interface NavItemConfig {
  id: WmsPage
  label: string
  icon: React.ReactNode
}

interface NavSection {
  title?: string
  titleColor?: string
  items: NavItemConfig[]
}

const navSections: NavSection[] = [
  {
    items: [{ id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> }],
  },
  {
    title: 'CATÁLOGO',
    titleColor: 'bg-emerald-500',
    items: [
      { id: 'products', label: 'Productos', icon: <Package className="h-4 w-4" /> },
      { id: 'equipment', label: 'Equipos', icon: <Cpu className="h-4 w-4" /> },
    ],
  },
  {
    title: 'OPERACIONES',
    titleColor: 'bg-amber-500',
    items: [
      { id: 'receiving', label: 'Recepción', icon: <Download className="h-4 w-4" /> },
      { id: 'sales', label: 'Ventas', icon: <ShoppingCart className="h-4 w-4" /> },
      { id: 'inventory', label: 'Inventario', icon: <Warehouse className="h-4 w-4" /> },
      { id: 'locations', label: 'Ubicaciones', icon: <MapPin className="h-4 w-4" /> },
      { id: 'physicalInventory', label: 'Inventario Físico', icon: <ClipboardCheck className="h-4 w-4" /> },
    ],
  },
  {
    items: [{ id: 'clients', label: 'Clientes', icon: <Users className="h-4 w-4" /> }],
  },
  {
    items: [{ id: 'movements', label: 'Movimientos', icon: <ArrowLeftRight className="h-4 w-4" /> }],
  },
  {
    items: [{ id: 'reports', label: 'Reportes', icon: <BarChart3 className="h-4 w-4" /> }],
  },
  {
    items: [{ id: 'alerts', label: 'Alertas', icon: <AlertTriangle className="h-4 w-4" /> }],
  },
  {
    title: 'SISTEMA',
    titleColor: 'bg-slate-400 dark:bg-slate-500',
    items: [{ id: 'settings', label: 'Configuración', icon: <Settings className="h-4 w-4" /> }],
  },
]

const pageTitles: Record<WmsPage, string> = {
  dashboard: 'Dashboard',
  products: 'Productos',
  equipment: 'Equipos',
  locations: 'Ubicaciones',
  inventory: 'Inventario',
  receiving: 'Recepción',
  sales: 'Ventas',
  clients: 'Clientes',
  movements: 'Movimientos',
  reports: 'Reportes',
  alerts: 'Alertas',
  physicalInventory: 'Inventario Físico',
  settings: 'Configuración',
}

export { pageTitles }

function QuickStats() {
  const { setCurrentPage, setSidebarOpen } = useWmsStore()

  const { data: alertData } = useQuery({
    queryKey: ['sidebar-alerts'],
    queryFn: () => fetch('/api/wms/alertas').then(r => r.json()),
    refetchInterval: 60000,
  })

  const { data: dashboardData } = useQuery({
    queryKey: ['sidebar-dashboard'],
    queryFn: () => fetch('/api/wms/dashboard').then(r => r.json()),
    refetchInterval: 60000,
  })

  const { data: productosData } = useQuery({
    queryKey: ['sidebar-productos-count'],
    queryFn: () => fetch('/api/wms/productos?pageSize=1').then(r => r.json()).then((d: any) => d.total ?? 0),
    refetchInterval: 120000,
  })

  const lowStockCount = Array.isArray(alertData) ? alertData.length : 0
  const ventasHoy = dashboardData?.ventasHoy?.total ?? 0
  const totalProductos = productosData ?? 0

  function handleQuickNav(page: WmsPage) {
    setCurrentPage(page)
    setSidebarOpen(false)
  }

  return (
    <div className="mx-3 mb-2 mt-2 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/30 p-2.5 space-y-1">
      <p className="text-[9px] text-muted-foreground/70 font-semibold uppercase tracking-[0.12em] mb-1.5">Resumen Rápido</p>
      <button
        onClick={() => handleQuickNav('alerts')}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/60 transition-colors text-left group"
      >
        <span className={cn('h-2 w-2 rounded-full shrink-0', lowStockCount > 0 ? 'bg-red-500' : 'bg-emerald-500')} />
        <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors flex-1">Stock Bajo:</span>
        <span className={cn('text-[11px] font-semibold tabular-nums', lowStockCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400')}>{lowStockCount}</span>
      </button>
      <button
        onClick={() => handleQuickNav('sales')}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/60 transition-colors text-left group"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
        <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors flex-1">Ventas Hoy:</span>
        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(ventasHoy)}</span>
      </button>
      <button
        onClick={() => handleQuickNav('products')}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/60 transition-colors text-left group"
      >
        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
        <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors flex-1">Productos:</span>
        <span className="text-[11px] font-semibold tabular-nums">{totalProductos}</span>
      </button>
    </div>
  )
}

function SidebarFooter() {
  const [time, setTime] = useState('')

  const { data: lastSale } = useQuery({
    queryKey: ['last-sale'],
    queryFn: () => fetch('/api/wms/ventas?limit=1').then(r => r.json()).then((data: any[]) => data[0] || null),
    refetchInterval: 60000,
  })

  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(
        now.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) +
        ' · ' +
        now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      )
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="shrink-0">
      <QuickStats />
      {lastSale && (
        <div className="mx-3 mb-2 rounded-lg p-2.5 mt-1 bg-primary/5 border border-primary/10">
          <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">Última Venta</p>
          <p className="text-xs font-semibold truncate text-foreground">{lastSale.folio} — {lastSale.cliente?.nombre}</p>
          <p className="text-[10px] text-primary font-semibold mt-0.5">{formatCurrency(lastSale.total)}</p>
        </div>
      )}
      <div className="border-t border-sidebar-border px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 text-primary/60" />
        <span>{time}</span>
      </div>
    </div>
  )
}

export function WmsSidebar() {
  const { currentPage, setCurrentPage, sidebarOpen, setSidebarOpen } = useWmsStore()
  const [isMobile, setIsMobile] = useState(false)
  const settings = useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getSettingsServerSnapshot)
  const warehouseName = (settings as any).warehouseName || 'WMS Repuestos'
  const warehouseSubtitle = (settings as any).warehouseAddress
    ? `${(settings as any).warehouseAddress}${(settings as any).warehousePhone ? ' · ' + (settings as any).warehousePhone : ''}`
    : 'Refrigeración'

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const { data: alertCount = 0 } = useQuery({
    queryKey: ['alert-count'],
    queryFn: async () => {
      const res = await fetch('/api/wms/alertas')
      if (!res.ok) return 0
      const data = await res.json()
      return Array.isArray(data) ? data.length : 0
    },
    refetchInterval: 60000,
  })

  function handleNav(page: WmsPage) {
    setCurrentPage(page)
    setSidebarOpen(false)
  }

  function renderNav() {
    return (
      <div className="flex flex-col h-full">
        {/* Header with brand icon effect */}
        <div className="px-4 py-4 border-b border-sidebar-border relative overflow-hidden">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent" />
          <div className="relative flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/25">
              <span className="text-lg">📦</span>
            </div>
            <div className="min-w-0">
              <span className="font-bold text-lg tracking-tight block truncate">{warehouseName}</span>
              <p className="text-[10px] text-muted-foreground tracking-wide truncate">{warehouseSubtitle}</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-3 py-2">
          {navSections.map((section, si) => (
            <div key={si} className={cn('mb-1', section.title === 'SISTEMA' && 'mt-2 pt-2 border-t border-sidebar-border')}>
              {section.title && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', section.titleColor || 'bg-primary')} />
                  <p className="text-[10px] font-bold text-muted-foreground/70 tracking-[0.12em]">
                    {section.title}
                  </p>
                </div>
              )}
              {(section.title === 'CATÁLOGO' || section.title === 'OPERACIONES') && (
                <div className="my-1 h-px bg-sidebar-border/60" />
              )}
              {section.items.map((item) => {
                const isActive = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all duration-200 mb-0.5 relative group',
                      isActive
                        ? 'text-primary'
                        : 'hover:text-foreground text-muted-foreground hover:bg-sidebar-accent/60'
                    )}
                  >
                    {/* Active indicator: left accent bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-primary shadow-sm shadow-primary/40" />
                    )}
                    {/* Subtle background on active */}
                    {isActive && (
                      <span className="absolute inset-0 bg-primary/8 rounded-r-lg" />
                    )}
                    <span className="relative z-10">{item.icon}</span>
                    <span className="relative z-10">{item.label}</span>
                    {item.id === 'alerts' && alertCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="relative z-10 ml-auto h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1"
                      >
                        {alertCount}
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </ScrollArea>

        <SidebarFooter />
      </div>
    )
  }

  return (
    <>
      {/* Mobile Sheet - only on mobile */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-[280px] max-w-[85vw] p-0 border-r border-sidebar-border/80"
            style={{ animation: 'slide-in-mobile 0.25s cubic-bezier(0.22, 1, 0.36, 1)' }}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navegación</SheetTitle>
            </SheetHeader>
            <div className="h-full flex flex-col">
              {/* Mobile gradient header */}
              <div className="px-5 py-5 border-b border-sidebar-border relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/4 to-transparent" />
                <div className="relative flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/30">
                    <span className="text-xl">📦</span>
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-base tracking-tight block truncate">{warehouseName}</span>
                    <p className="text-[10px] text-muted-foreground tracking-wide truncate mt-0.5">{warehouseSubtitle}</p>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 px-3 py-2">
                {navSections.map((section, si) => (
                  <div key={si} className={cn('mb-1', section.title === 'SISTEMA' && 'mt-2 pt-2 border-t border-sidebar-border')}>
                    {section.title && (
                      <div className="flex items-center gap-2 px-3 py-2">
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', section.titleColor || 'bg-primary')} />
                        <p className="text-[10px] font-bold text-muted-foreground/70 tracking-[0.12em]">
                          {section.title}
                        </p>
                      </div>
                    )}
                    {(section.title === 'CATÁLOGO' || section.title === 'OPERACIONES') && (
                      <div className="my-1 h-px bg-sidebar-border/60" />
                    )}
                    {section.items.map((item) => {
                      const isActive = currentPage === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNav(item.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 mb-0.5 relative group',
                            isActive
                              ? 'text-primary'
                              : 'hover:text-foreground text-muted-foreground hover:bg-sidebar-accent/60'
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-primary shadow-sm shadow-primary/40" />
                          )}
                          {isActive && (
                            <span className="absolute inset-0 bg-primary/8 rounded-r-lg" />
                          )}
                          <span className="relative z-10">{item.icon}</span>
                          <span className="relative z-10">{item.label}</span>
                          {item.id === 'alerts' && alertCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="relative z-10 ml-auto h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1 badge-pop"
                            >
                              {alertCount}
                            </Badge>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </ScrollArea>

              <SidebarFooter />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop sidebar — gradient background */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground h-screen sticky top-0 shrink-0 relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-primary/[0.02] pointer-events-none" />
        <div className="relative flex flex-col h-full">
          {renderNav()}
        </div>
      </aside>
    </>
  )
}
