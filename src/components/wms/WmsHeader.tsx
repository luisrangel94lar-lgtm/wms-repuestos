'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useWmsStore } from '@/store/wms'
import { pageTitles } from './WmsSidebar'
import { SearchResults } from './SearchResults'
import { Menu, Search, User, X, Sun, Moon, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from 'next-themes'
import type { WmsPage } from '@/types/wms'

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
}

export function WmsHeader() {
  const { currentPage, toggleSidebar, searchQuery, setSearchQuery } = useWmsStore()
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [showResults, setShowResults] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()

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
    }
  }, [])

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
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 md:px-6 py-3">
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

        <div ref={containerRef} className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="Buscar productos, equipos... (Ctrl+K)"
            className="pl-9 pr-9 h-9"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onFocus={() => localQuery.length >= 2 && setShowResults(true)}
          />
          {localQuery.length > 0 && (
            <button
              onClick={handleClear}
              className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
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

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Cambiar tema"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* User avatar with dropdown */}
        <div ref={avatarRef} className="relative shrink-0">
          <button
            onClick={() => setAvatarOpen(!avatarOpen)}
            className="flex items-center gap-1.5 h-9 px-1 rounded-lg hover:bg-accent transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              A
            </div>
            <span className="hidden sm:inline text-sm font-medium">Admin</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {avatarOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-popover p-1 shadow-md z-50">
              <div className="px-3 py-2 border-b mb-1">
                <p className="text-sm font-medium">Admin</p>
                <p className="text-xs text-muted-foreground">admin@wms.local</p>
              </div>
              <button className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors">
                Configuración
              </button>
              <button className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors">
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Breadcrumbs and description */}
      <div className="px-4 md:px-6 pb-2 flex flex-col gap-0.5">
        <nav className="flex items-center gap-1 text-xs">
          {pathParts.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground">/</span>}
              <span className={i === pathParts.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                {part}
              </span>
            </span>
          ))}
        </nav>
        <p className="text-[11px] text-muted-foreground truncate max-w-lg">{crumb.description}</p>
      </div>
    </header>
  )
}
