'use client'

import { useEffect, useState } from 'react'
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
  ChevronLeft,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency } from './lib/format'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useQuery } from '@tanstack/react-query'

interface NavItemConfig {
  id: WmsPage
  label: string
  icon: React.ReactNode
}

interface NavSection {
  title?: string
  items: NavItemConfig[]
}

const navSections: NavSection[] = [
  {
    items: [{ id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> }],
  },
  {
    title: 'CATÁLOGO',
    items: [
      { id: 'products', label: 'Productos', icon: <Package className="h-4 w-4" /> },
      { id: 'equipment', label: 'Equipos', icon: <Cpu className="h-4 w-4" /> },
    ],
  },
  {
    title: 'OPERACIONES',
    items: [
      { id: 'receiving', label: 'Recepción', icon: <Download className="h-4 w-4" /> },
      { id: 'sales', label: 'Ventas', icon: <ShoppingCart className="h-4 w-4" /> },
      { id: 'inventory', label: 'Inventario', icon: <Warehouse className="h-4 w-4" /> },
      { id: 'locations', label: 'Ubicaciones', icon: <MapPin className="h-4 w-4" /> },
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
}

export { pageTitles }

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
      {lastSale && (
        <div className="px-4 py-2 border-t">
          <p className="text-[10px] text-muted-foreground">Última Venta</p>
          <p className="text-xs font-medium truncate">{lastSale.folio} — {lastSale.cliente?.nombre}</p>
          <p className="text-[10px] text-muted-foreground">{formatCurrency(lastSale.total)}</p>
        </div>
      )}
      <div className="border-t px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>{time}</span>
      </div>
    </div>
  )
}

export function WmsSidebar() {
  const { currentPage, setCurrentPage, sidebarOpen, setSidebarOpen } = useWmsStore()
  const [isMobile, setIsMobile] = useState(false)

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
        {/* Header with gradient accent */}
        <div className="px-4 py-4 border-b bg-gradient-to-br from-primary/5 via-transparent to-primary/[0.02]">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📦</span>
            <span className="font-bold text-lg">WMS Repuestos</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wide">Refrigeración</p>
        </div>

        <ScrollArea className="flex-1 px-3 py-2">
          {navSections.map((section, si) => (
            <div key={si} className="mb-2">
              {section.title && (
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground tracking-wider">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 mb-0.5',
                      isActive
                        ? 'bg-primary text-primary-foreground border-l-[3px] border-l-primary-foreground/60'
                        : 'hover:bg-accent text-foreground border-l-[3px] border-l-transparent'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.id === 'alerts' && alertCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-auto h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1"
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
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navegación</SheetTitle>
            </SheetHeader>
            {renderNav()}
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r bg-sidebar text-sidebar-foreground h-screen sticky top-0 shrink-0">
        {renderNav()}
      </aside>
    </>
  )
}
