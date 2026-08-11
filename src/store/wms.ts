import { create } from 'zustand';
import type { WmsPage } from '@/types/wms';

interface WmsState {
  currentPage: WmsPage;
  sidebarOpen: boolean;
  searchQuery: string;
  receivingProductId: number | null;
  setCurrentPage: (page: WmsPage) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setReceivingProductId: (id: number | null) => void;
}

export const useWmsStore = create<WmsState>((set) => ({
  currentPage: 'dashboard',
  sidebarOpen: true,
  searchQuery: '',
  receivingProductId: null,
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setReceivingProductId: (id) => set({ receivingProductId: id }),
}));
