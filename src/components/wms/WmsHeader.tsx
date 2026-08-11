'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useWmsStore } from '@/store/wms'
import { pageTitles } from './WmsSidebar'
import { SearchResults } from './SearchResults'
import { Menu, Search, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function WmsHeader() {
  const { currentPage, toggleSidebar, searchQuery, setSearchQuery } = useWmsStore()
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [showResults, setShowResults] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 px-4 md:px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

      <div className="flex items-center gap-2 shrink-0">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </header>
  )
}
