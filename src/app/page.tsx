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
import { Toaster } from '@/components/ui/sonner'
import type { WmsPage } from '@/types/wms'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

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
  const PageComponent = pageComponents[currentPage]

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex flex-1 overflow-hidden">
          <WmsSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <WmsHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              <PageComponent />
            </main>
            <footer className="border-t px-4 md:px-6 py-3 text-center text-xs text-muted-foreground bg-background">
              WMS Pilot - Sistema de Gestión de Almacén
            </footer>
          </div>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}
