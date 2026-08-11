'use client'

import { useQuery } from '@tanstack/react-query'
import { useWmsStore } from '@/store/wms'
import type { SearchResult } from '@/types/wms'
import { Package, Cpu } from 'lucide-react'
import { Loader2 } from 'lucide-react'

interface SearchResultsProps {
  query: string
  onSelect: () => void
}

export function SearchResults({ query, onSelect }: SearchResultsProps) {
  const { setCurrentPage } = useWmsStore()

  const { data: results = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ['search', query],
    queryFn: () => fetch(`/api/wms/busqueda?q=${encodeURIComponent(query)}`).then((r) => r.json()),
    enabled: query.length >= 2,
    staleTime: 10000,
  })

  if (query.length < 2) return null
  if (isLoading) {
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Buscando...
        </div>
      </div>
    )
  }
  if (results.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 p-4">
        <p className="text-sm text-muted-foreground text-center">
          Sin resultados para "{query}"
        </p>
      </div>
    )
  }

  const products = results.filter((r) => r.type === 'product')
  const equipment = results.filter((r) => r.type === 'equipment')

  function handleResultClick(result: SearchResult) {
    if (result.type === 'product') {
      setCurrentPage('products')
    } else {
      setCurrentPage('equipment')
    }
    onSelect()
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
      {products.length > 0 && (
        <div className="p-2">
          <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Productos</p>
          {products.slice(0, 5).map((r) => (
            <button
              key={`p-${r.id}`}
              onClick={() => handleResultClick(r)}
              className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-accent text-left transition-colors"
            >
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.nombre}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {r.sku} {r.subtext ? `· ${r.subtext}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      {equipment.length > 0 && (
        <div className="p-2 border-t">
          <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Equipos</p>
          {equipment.slice(0, 5).map((r) => (
            <button
              key={`e-${r.id}`}
              onClick={() => handleResultClick(r)}
              className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-accent text-left transition-colors"
            >
              <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.nombre}</p>
                {r.subtext && (
                  <p className="text-xs text-muted-foreground truncate">{r.subtext}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
