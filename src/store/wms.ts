import { create } from 'zustand'
import type { WmsPage } from '@/types/wms'

export interface SessionUser {
  id: number
  nombre: string
  email: string
  rol: string
  empresaId?: number
  almacenId?: number
}

export interface SessionData {
  user: SessionUser
  expires: string
}

export interface LicenseInfo {
  active: boolean
  type: string
  daysLeft: number
  expired: boolean
  fechaVencimiento: string | null
  maxUsuarios: number
}

interface WmsState {
  currentPage: WmsPage
  sidebarOpen: boolean
  searchQuery: string
  receivingProductId: number | null
  receivingSuggestedQty: number | null
  session: SessionData | null
  licenseInfo: LicenseInfo | null
  isAuthenticated: boolean
  showLogin: boolean
  selectedEmpresaId: number | null
  selectedAlmacenId: number | null
  setCurrentPage: (page: WmsPage) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  setReceivingProductId: (id: number | null, qty?: number | null) => void
  setSession: (session: SessionData | null) => void
  setLicenseInfo: (info: LicenseInfo | null) => void
  setShowLogin: (show: boolean) => void
  setSelectedEmpresaId: (id: number | null) => void
  setSelectedAlmacenId: (id: number | null) => void
  logout: () => void
}

export const useWmsStore = create<WmsState>((set) => ({
  currentPage: 'dashboard',
  sidebarOpen: true,
  searchQuery: '',
  receivingProductId: null,
  receivingSuggestedQty: null,
  session: null,
  licenseInfo: null,
  isAuthenticated: false,
  showLogin: false,
  selectedEmpresaId: null,
  selectedAlmacenId: null,
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setReceivingProductId: (id, qty) => set({ receivingProductId: id, receivingSuggestedQty: qty ?? null }),
  setSession: (session) => set({ session, isAuthenticated: session !== null }),
  setLicenseInfo: (info) => set({ licenseInfo: info }),
  setShowLogin: (show) => set({ showLogin: show }),
  setSelectedEmpresaId: (id) => set({ selectedEmpresaId: id }),
  setSelectedAlmacenId: (id) => set({ selectedAlmacenId: id }),
  logout: () => {
    fetch('/api/auth/signout', { method: 'POST' }).catch(() => {})
    set({ session: null, isAuthenticated: false, showLogin: true })
  },
}))
