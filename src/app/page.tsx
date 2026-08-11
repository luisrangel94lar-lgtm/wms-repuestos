'use client'

import { useWmsStore } from '@/store/wms'
import { WmsSidebar } from '@/components/wms/WmsSidebar'
import { WmsHeader } from '@/components/wms/WmsHeader'
import { DashboardPage } from '@/components/wms/DashboardPage'
import { ProductsPage } from '@/components/wms/ProductsPage'
import { EquipmentPage } from '@/components/wms/EquipmentPage'
import { LocationsPage } from '@/components/wms/LocationsPage'
import { InventoryPage } from '@/components/wms/InventoryPage'
import { ReceivingPage } from '@/components/wms/ReceivingPage'
import { SalesPage } from '@/components/wms/SalesPage'
import { ClientsPage } from '@/components/wms/ClientsPage'
import { MovementsPage } from '@/components/wms/MovementsPage'
import { ReportsPage } from '@/components/wms/ReportsPage'
import { AlertsPage } from '@/components/wms/AlertsPage'
import { SettingsPage } from '@/components/wms/SettingsPage'
import { PhysicalInventoryPage } from '@/components/wms/PhysicalInventoryPage'
import { Toaster } from '@/components/ui/sonner'
import type { WmsPage } from '@/types/wms'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

const SETTINGS_KEY = 'wms-settings'
const SETTINGS_EVENT = 'wms-settings-changed'

function subscribeSettings(callback: () => void) {
  window.addEventListener(SETTINGS_EVENT, callback)
  return () => window.removeEventListener(SETTINGS_EVENT, callback)
}

const EMPTY_SETTINGS: Record<string, unknown> = {}

function getSettingsSnapshot() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return EMPTY_SETTINGS
}

function getSettingsServerSnapshot() {
  return EMPTY_SETTINGS
}

const pageComponents: Record<WmsPage, React.ComponentType> = {
  dashboard: DashboardPage,
  products: ProductsPage,
  equipment: EquipmentPage,
  locations: LocationsPage,
  inventory: InventoryPage,
  receiving: ReceivingPage,
  sales: SalesPage,
  clients: ClientsPage,
  movements: MovementsPage,
  reports: ReportsPage,
  alerts: AlertsPage,
  physicalInventory: PhysicalInventoryPage,
  settings: SettingsPage,
}

export default function Home() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15000,
        retry: 1,
      },
    },
  }))
  const { currentPage } = useWmsStore()
  const { theme } = useTheme()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const settings = useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getSettingsServerSnapshot)
  const warehouseName = (settings as any).warehouseName || 'WMS Pilot v1.0'
  const PageComponent = pageComponents[currentPage]
  const dateStr = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-background/[0.97] dark:from-background dark:to-background/[0.85]">
        <div className="flex flex-1 overflow-hidden">
          <WmsSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <WmsHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 animate-page-transition">
              <PageComponent />
            </main>
            <footer className="relative px-4 md:px-6 py-3 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm flex items-center justify-between mt-auto">
              {/* Subtle top border gradient: teal → transparent */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/60 via-teal-500/30 to-transparent" />
              <span>{warehouseName}</span>
              <span className="flex items-center gap-2">
                <span className="hidden sm:inline capitalize">{dateStr}</span>
                <span className="flex items-center gap-1">
                  {mounted && (
                    <>
                      {theme === 'dark' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                      {theme === 'dark' ? 'Oscuro' : 'Claro'}
                    </>
                  )}
                </span>
              </span>
            </footer>
          </div>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}
