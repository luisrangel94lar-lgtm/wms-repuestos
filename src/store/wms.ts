import { create } from 'zustand';
import type { WmsPage } from '@/types/wms';

interface WmsState {
  currentPage: WmsPage;
  sidebarOpen: boolean;
  searchQuery: string;
  setCurrentPage: (page: WmsPage) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const useWmsStore = create<WmsState>((set) => ({
  currentPage: 'dashboard',
  sidebarOpen: true,
  searchQuery: '',
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
