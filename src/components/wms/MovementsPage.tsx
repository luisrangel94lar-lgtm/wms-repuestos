'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, ArrowLeftRight, ArrowDownCircle, ArrowUpCircle, RefreshCw, BookOpen } from 'lucide-react'
import { formatDateTime, tipoMovColors } from './lib/format'
import { cn } from '@/lib/utils'

const tipoMovBorder: Record<string, string> = {
  ENTRADA: 'border-l-emerald-500',
  SALIDA: 'border-l-red-500',
  AJUSTE: 'border-l-amber-500',
  TRASLADO: 'border-l-muted-foreground/30',
  DEVOLUCION: 'border-l-purple-500',
}

const tipoMovIcon: Record<string, React.ReactNode> = {
  ENTRADA: <ArrowDownCircle className="h-3 w-3" />,
  SALIDA: <ArrowUpCircle className="h-3 w-3" />,
  AJUSTE: <RefreshCw className="h-3 w-3" />,
  TRASLADO: <ArrowLeftRight className="h-3 w-3" />,
  DEVOLUCION: <ArrowDownCircle className="h-3 w-3" />,
}

export function MovementsPage() {
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [idTipo, setIdTipo] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState(false)
  const [kardexProduct, setKardexProduct] = useState<{id: number; nombre: string; sku: string} | null>(null)
  const [showKardex, setShowKardex] = useState(false)
  const [kardexTipo, setKardexTipo] = useState('')

  const { data: tiposMov = [] } = useQuery({
    queryKey: ['tipos-mov-movements'],
    queryFn: () => fetch('/api/wms/tipos-movimiento').then((r) => r.json()),
  })

  const queryParams = new URLSearchParams()
  if (fechaDesde) queryParams.set('fechaDesde', fechaDesde)
  if (fechaHasta) queryParams.set('fechaHasta', fechaHasta)
  if (idTipo) queryParams.set('idTipo', idTipo)
  const queryStr = queryParams.toString()

  const { data: movimientos = [], isLoading } = useQuery({
    queryKey: ['movimientos', queryStr],
    queryFn: () => fetch(`/api/wms/movimientos${queryStr ? `?${queryStr}` : ''}`).then((r) => r.json()),
  })

  const filtered = search
    ? movimientos.filter((m: any) =>
        m.producto?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        m.producto?.sku?.toLowerCase().includes(search.toLowerCase())
      )
    : movimientos

  const { data: kardexData = [], isLoading: kardexLoading } = useQuery({
    queryKey: ['kardex', kardexProduct?.id],
    queryFn: () => fetch(`/api/wms/reportes/kardex/${kardexProduct?.id}`).then(r => r.json()),
    enabled: showKardex && !!kardexProduct?.id,
  })

  function applyFilters() {
    setSearch(searchInput)
    setApplied(true)
  }

  function setQuickDate(range: 'today' | 'week' | 'month') {
    const now = new Date()
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    if (range === 'today') {
      setFechaDesde(fmt(now))
      setFechaHasta(fmt(now))
    } else if (range === 'week') {
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      setFechaDesde(fmt(start))
      setFechaHasta(fmt(now))
    } else if (range === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      setFechaDesde(fmt(start))
      setFechaHasta(fmt(now))
    }
  }

  return (
    <div className="space-y-4">
      {/* Quick date filters */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setQuickDate('today')}>
          Hoy
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setQuickDate('week')}>
          Esta Semana
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setQuickDate('month')}>
          Este Mes
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-xl shadow-sm transition-all duration-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Fecha Desde</Label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha Hasta</Label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={idTipo} onValueChange={setIdTipo}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  {tiposMov.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Producto</Label>
              <Input placeholder="Nombre o SKU" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyFilters()} />
            </div>
            <Button onClick={applyFilters}><Search className="h-4 w-4 mr-1" /> Filtrar</Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Historial completo de movimientos de almacén (kardex)</p>
      </div>

      <p className="text-sm text-muted-foreground">
        <ArrowLeftRight className="h-4 w-4 inline mr-1" />
        {filtered.length} movimientos encontrados
      </p>

      {/* Table */}
      <Card className="rounded-xl shadow-sm transition-all duration-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="text-xs">Producto</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs text-center">Cantidad</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Ubicación</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Usuario</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Referencia</TableHead>
                  <TableHead className="text-xs text-center">Kardex</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Sin movimientos</TableCell></TableRow>
                )}
                {!isLoading && filtered.slice(0, 100).map((m: any) => {
                  const tipoNombre = m.tipoMovimiento?.nombre ?? ''
                  return (
                    <TableRow
                      key={m.id}
                      className={cn(
                        'hover:bg-muted/50 border-l-4',
                        tipoMovBorder[tipoNombre] ?? 'border-l-transparent'
                      )}
                    >
                      <TableCell className="text-xs py-2 whitespace-nowrap">{formatDateTime(m.fecha)}</TableCell>
                      <TableCell className="text-xs py-2">
                        <span className="font-medium">{m.producto?.nombre?.substring(0, 25)}</span>
                        <span className="text-muted-foreground ml-1 font-mono">({m.producto?.sku})</span>
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${tipoMovColors[tipoNombre] ?? 'bg-gray-100 text-gray-800'}`}>
                          {tipoMovIcon[tipoNombre]}
                          {tipoNombre}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-center font-mono py-2">{m.cantidad}</TableCell>
                      <TableCell className="text-xs py-2 hidden md:table-cell">
                        {m.ubicacion ? `${m.ubicacion.pasillo}-${m.ubicacion.estante}-${m.ubicacion.nivel}` : '-'}
                      </TableCell>
                      <TableCell className="text-xs py-2 hidden lg:table-cell">{m.usuario ?? '-'}</TableCell>
                      <TableCell className="text-xs py-2 hidden sm:table-cell text-muted-foreground">{m.referencia ?? '-'}</TableCell>
                      <TableCell className="text-xs text-center py-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); setKardexProduct({ id: m.idProducto, nombre: m.producto?.nombre, sku: m.producto?.sku }); setShowKardex(true); setKardexTipo('') }}
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Kardex Dialog */}
      <Dialog open={showKardex} onOpenChange={setShowKardex}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kardex - {kardexProduct?.nombre}</DialogTitle>
            <DialogDescription className="sr-only">Historial de movimientos del producto</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">SKU: {kardexProduct?.sku} | Historial completo de movimientos</p>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs">Filtrar tipo:</Label>
              <Select value={kardexTipo} onValueChange={setKardexTipo}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="1">Entrada</SelectItem>
                  <SelectItem value="2">Salida</SelectItem>
                  <SelectItem value="3">Ajuste</SelectItem>
                  <SelectItem value="4">Traslado</SelectItem>
                  <SelectItem value="5">Devolución</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs text-center">Entrada</TableHead>
                    <TableHead className="text-xs text-center">Salida</TableHead>
                    <TableHead className="text-xs text-center">Saldo</TableHead>
                    <TableHead className="text-xs">Referencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kardexLoading && <TableRow><TableCell colSpan={6}><Skeleton className="h-8" /></TableCell></TableRow>}
                  {(() => {
                    let kardexEntries = (kardexData as any)?.kardex ?? []
                    if (kardexTipo && kardexTipo !== 'all') {
                      kardexEntries = kardexEntries.filter((entry: any) => String(entry.idTipo) === kardexTipo)
                    }
                    if (kardexEntries.length === 0 && !kardexLoading) {
                      return <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">Sin movimientos</TableCell></TableRow>
                    }
                    return kardexEntries.map((entry: any, idx: number) => (
                      <TableRow key={idx} className="hover:bg-muted/50">
                        <TableCell className="text-xs py-2">{formatDateTime(entry.fecha)}</TableCell>
                        <TableCell className="text-xs py-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${tipoMovColors[entry.tipoMovimiento?.nombre] ?? 'bg-gray-100 text-gray-800'}`}>
                            {entry.tipoMovimiento?.nombre}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs py-2 text-center text-emerald-600 font-mono">
                          {entry.tipoMovimiento?.nombre === 'ENTRADA' || entry.tipoMovimiento?.nombre === 'DEVOLUCION' ? `+${entry.cantidad}` : '-'}
                        </TableCell>
                        <TableCell className="text-xs py-2 text-center text-red-600 font-mono">
                          {entry.tipoMovimiento?.nombre === 'SALIDA' ? `-${entry.cantidad}` : '-'}
                        </TableCell>
                        <TableCell className="text-xs py-2 text-center font-bold">{entry.saldo}</TableCell>
                        <TableCell className="text-xs py-2 text-muted-foreground">{entry.referencia ?? '-'}</TableCell>
                      </TableRow>
                    ))
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
