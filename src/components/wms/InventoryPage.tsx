'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useWmsStore } from '@/store/wms'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Download, MapPin, Check, AlertTriangle, XCircle, SlidersHorizontal, ArrowRightLeft, Loader2, Eye, Clock, Package,
} from 'lucide-react'
import { formatCurrency, formatDateTime, tipoMovColors } from './lib/format'
import { exportToCSV } from './lib/export-csv'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { SortableHeader } from './lib/SortableHeader'

interface StockEntry {
  idProducto: number
  idUbicacion: number
  cantidad: number
  producto: { id: number; sku: string; nombre: string; costoUnitario: number; precioVenta: number; stockMinimo: number }
  ubicacion: { id: number; pasillo: string; estante: string; nivel: string }
}

interface InventoryItem {
  id: number
  sku: string
  nombre: string
  descripcion: string | null
  idCategoria: number | null
  idMarca: number | null
  costoUnitario: number
  precioVenta: number
  stockMinimo: number
  totalStock: number
  valorTotal: number
  status: 'ok' | 'low' | 'out'
  stocks: StockEntry[]
  categoria?: { id: number; nombre: string } | null
  marca?: { id: number; nombre: string } | null
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'out')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold badge-danger">
        <XCircle className="h-3 w-3" /> Sin Stock
      </span>
    )
  if (status === 'low')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold badge-warning">
        <AlertTriangle className="h-3 w-3" /> Bajo Stock
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold badge-success">
      <Check className="h-3 w-3" /> OK
    </span>
  )
}

export function InventoryPage() {
  const queryClient = useQueryClient()
  const { setCurrentPage, setReceivingProductId } = useWmsStore()
  const [selectedProduct, setSelectedProduct] = useState<StockEntry['producto'] | null>(null)
  const [sheetProduct, setSheetProduct] = useState<InventoryItem | null>(null)

  // Ajuste state
  const [ajusteProduct, setAjusteProduct] = useState<InventoryItem | null>(null)
  const [ajusteStock, setAjusteStock] = useState('')
  const [ajusteMotivo, setAjusteMotivo] = useState('')
  const [ajusteLoading, setAjusteLoading] = useState(false)

  // Traslado state
  const [trasladoProduct, setTrasladoProduct] = useState<InventoryItem | null>(null)
  const [trasladoOrigen, setTrasladoOrigen] = useState('')
  const [trasladoDestino, setTrasladoDestino] = useState('')
  const [trasladoCantidad, setTrasladoCantidad] = useState('')
  const [trasladoLoading, setTrasladoLoading] = useState(false)

  // Sorting state
  const [sortField, setSortField] = useState<string>('nombre')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-inventory'],
    queryFn: () => fetch('/api/wms/productos?pageSize=500').then((r) => r.json()).then((d: any) => d.items ?? []),
  })

  const { data: stockEntries = [] } = useQuery<StockEntry[]>({
    queryKey: ['all-stock-inv'],
    queryFn: () => fetch('/api/wms/stock').then((r) => r.json()),
  })

  const { data: allLocations = [] } = useQuery({
    queryKey: ['all-locations'],
    queryFn: () => fetch('/api/wms/ubicaciones?activos=true').then((r) => r.json()),
  })

  const { data: productMovements = [] } = useQuery({
    queryKey: ['product-movements-sheet', sheetProduct?.id],
    queryFn: () => fetch(`/api/wms/movimientos?idProducto=${sheetProduct?.id}&limit=5`).then((r) => r.json()),
    enabled: !!sheetProduct?.id,
  })

  // Build inventory view
  const inventory: InventoryItem[] = products.map((p: any) => {
    const stocks = stockEntries.filter((s) => s.idProducto === p.id)
    const totalStock = stocks.reduce((sum, s) => sum + s.cantidad, 0)
    const valorTotal = totalStock * p.costoUnitario
    let status: 'ok' | 'low' | 'out' = 'ok'
    if (totalStock === 0) status = 'out'
    else if (totalStock < p.stockMinimo) status = 'low'
    return { ...p, totalStock, valorTotal, status, stocks }
  })

  const { data: inventoryStats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: () => fetch('/api/wms/dashboard').then(r => r.json()).then(d => ({
      totalProducts: d.totalProductos,
      stockValue: d.valorTotalStock,
      bajoStock: d.productosBajoStock?.count ?? 0,
    })),
  })

  const totalValor = inventory.reduce((sum, p) => sum + p.valorTotal, 0)

  function invalidateInventory() {
    queryClient.invalidateQueries({ queryKey: ['products-inventory'] })
    queryClient.invalidateQueries({ queryKey: ['all-stock-inv'] })
    queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
    queryClient.invalidateQueries({ queryKey: ['product-movements-sheet'] })
  }

  // --- Sorting ---
  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }
  function getSortValue(item: InventoryItem, field: string): any {
    if (field === 'margen') {
      return item.precioVenta > 0 ? ((item.precioVenta - item.costoUnitario) / item.precioVenta * 100) : 0
    }
    return item[field as keyof InventoryItem]
  }

  const sortedInventory = [...inventory].sort((a, b) => {
    let aVal: any = getSortValue(a, sortField)
    let bVal: any = getSortValue(b, sortField)
    if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal as string).toLowerCase() }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  // --- AJUSTE handlers ---
  function openAjuste(item: InventoryItem) {
    setAjusteProduct(item)
    setAjusteStock(String(item.totalStock))
    setAjusteMotivo('')
  }

  async function submitAjuste() {
    if (!ajusteProduct || ajusteStock === '') return
    const newStock = parseInt(ajusteStock, 10)
    if (isNaN(newStock) || newStock < 0) {
      toast.error('Cantidad inválida')
      return
    }

    const locationId = ajusteProduct.stocks.length > 0
      ? ajusteProduct.stocks[0].idUbicacion
      : allLocations[0]?.id

    if (!locationId) {
      toast.error('No hay ubicaciones disponibles')
      return
    }

    setAjusteLoading(true)
    try {
      const res = await fetch('/api/wms/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idProducto: ajusteProduct.id,
          idUbicacion: locationId,
          idTipo: 3,
          cantidad: newStock,
          referencia: 'Ajuste manual',
          observacion: ajusteMotivo || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al ajustar stock')
      }
      toast.success('Stock ajustado correctamente')
      setAjusteProduct(null)
      invalidateInventory()
    } catch (e: any) {
      toast.error(e.message || 'Error al ajustar stock')
    } finally {
      setAjusteLoading(false)
    }
  }

  // --- TRASLADO handlers ---
  function openTraslado(item: InventoryItem) {
    if (item.stocks.length < 1) return
    setTrasladoProduct(item)
    setTrasladoOrigen(String(item.stocks[0].idUbicacion))
    setTrasladoDestino('')
    setTrasladoCantidad('')
  }

  function getOrigenStock(): number {
    if (!trasladoProduct) return 0
    const entry = trasladoProduct.stocks.find((s) => String(s.idUbicacion) === trasladoOrigen)
    return entry?.cantidad ?? 0
  }

  async function submitTraslado() {
    if (!trasladoProduct || !trasladoOrigen || !trasladoDestino || !trasladoCantidad) return
    if (trasladoOrigen === trasladoDestino) {
      toast.error('El origen y destino no pueden ser iguales')
      return
    }
    const qty = parseInt(trasladoCantidad, 10)
    if (isNaN(qty) || qty <= 0) {
      toast.error('Cantidad inválida')
      return
    }
    const origenStock = getOrigenStock()
    if (qty > origenStock) {
      toast.error(`Stock insuficiente en origen (disponible: ${origenStock})`)
      return
    }

    setTrasladoLoading(true)
    try {
      const res = await fetch('/api/wms/stock/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idProducto: trasladoProduct.id,
          idUbicacionOrigen: parseInt(trasladoOrigen, 10),
          idUbicacionDestino: parseInt(trasladoDestino, 10),
          cantidad: qty,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error en traslado')
      }
      toast.success('Traslado realizado correctamente')
      setTrasladoProduct(null)
      invalidateInventory()
    } catch (e: any) {
      toast.error(e.message || 'Error en traslado')
    } finally {
      setTrasladoLoading(false)
    }
  }

  // --- CSV Export ---
  function exportInventory() {
    exportToCSV(
      inventory.map((p) => ({
        producto: p.nombre,
        sku: p.sku,
        totalStock: p.totalStock,
        valorTotal: p.valorTotal,
      })),
      'inventario',
      [
        { key: 'producto', label: 'Producto' },
        { key: 'sku', label: 'SKU' },
        { key: 'totalStock', label: 'Stock Total' },
        { key: 'valorTotal', label: 'Valor Total', format: 'currency' },
      ],
    )
  }

  function openSheet(item: InventoryItem) {
    setSheetProduct(item)
  }

  function quickGoToReceiving() {
    if (!sheetProduct) return
    const deficiency = sheetProduct.stockMinimo - sheetProduct.totalStock
    setReceivingProductId(sheetProduct.id, deficiency > 0 ? deficiency : null)
    setCurrentPage('receiving')
    setSheetProduct(null)
  }

  function quickAdjust() {
    if (!sheetProduct) return
    setSheetProduct(null)
    openAjuste(sheetProduct)
  }

  function quickTransfer() {
    if (!sheetProduct) return
    setSheetProduct(null)
    openTraslado(sheetProduct)
  }

  // Find max stock for the location bars
  function getMaxStock(): number {
    if (!sheetProduct) return 1
    const max = Math.max(...sheetProduct.stocks.map((s) => s.cantidad), sheetProduct.stockMinimo)
    return max || 1
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Card className="rounded-lg px-4 py-3 shadow-sm">
          <p className="text-xs text-muted-foreground">Productos Activos</p>
          <p className="text-lg font-bold">{products.length}</p>
        </Card>
        <Card className="rounded-lg px-4 py-3 shadow-sm">
          <p className="text-xs text-muted-foreground">Valor Total</p>
          <p className="text-lg font-bold">{formatCurrency(inventoryStats?.stockValue ?? totalValor)}</p>
        </Card>
        <Card className="rounded-lg px-4 py-3 shadow-sm">
          <p className="text-xs text-muted-foreground">Bajo Mínimo</p>
          <p className="text-lg font-bold text-destructive">{inventoryStats?.bajoStock ?? 0}</p>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {inventory.length} productos · Valor total: <span className="font-semibold text-foreground">{formatCurrency(totalValor)}</span>
          </p>
        </div>
        <Button variant="outline" onClick={exportInventory}>
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Vista consolidada del inventario actual</p>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          <div className="table-container max-h-[calc(100vh-14rem)] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="nombre" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Producto</SortableHeader>
                  <SortableHeader field="sku" sortField={sortField} sortDir={sortDir} onSort={handleSort}>SKU</SortableHeader>
                  <SortableHeader field="totalStock" align="center" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Total Stock</SortableHeader>
                  <SortableHeader field="valorTotal" align="right" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Valor Total</SortableHeader>
                  <SortableHeader field="margen" align="right" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Margen %</SortableHeader>
                  <TableHead className="text-xs text-center">Estado</TableHead>
                  <TableHead className="text-xs text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && sortedInventory.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin productos en inventario</TableCell></TableRow>
                )}
                {!isLoading && sortedInventory.map((p, idx) => {
                  const margen = p.precioVenta > 0 ? ((p.precioVenta - p.costoUnitario) / p.precioVenta * 100) : 0
                  return (
                    <TableRow key={p.id} className={cn('hover:bg-muted/50 cursor-pointer', idx % 2 === 1 && 'bg-muted/20')} onClick={() => openSheet(p)}>
                      <TableCell className="text-xs font-medium py-2 max-w-[200px] truncate">{p.nombre}</TableCell>
                      <TableCell className="text-xs font-mono py-2">{p.sku}</TableCell>
                      <TableCell className="text-xs text-center font-mono py-2">{p.totalStock}</TableCell>
                      <TableCell className="text-xs text-right py-2">{formatCurrency(p.valorTotal)}</TableCell>
                      <TableCell className="text-xs text-right py-2">
                        <span className={cn(
                          'font-mono',
                          margen >= 30 ? 'text-emerald-600 dark:text-emerald-400' :
                          margen >= 15 ? 'text-amber-600 dark:text-amber-400' :
                          'text-red-600 dark:text-red-400'
                        )}>
                          {margen.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-center py-2"><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="text-xs text-right py-2">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver detalle" onClick={() => openSheet(p)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver ubicaciones" onClick={() => setSelectedProduct(p)}>
                            <MapPin className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Ajustar stock" onClick={() => openAjuste(p)}>
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </Button>
                          {p.stocks.length > 1 && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Trasladar" onClick={() => openTraslado(p)}>
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stock by location dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => { if (!open) setSelectedProduct(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="dialog-header-accent"><DialogTitle>Stock por Ubicación</DialogTitle><DialogDescription>Detalle de stock por ubicación del producto</DialogDescription></DialogHeader>
          {selectedProduct && (
            <div className="space-y-3">
              <p className="text-sm"><span className="text-muted-foreground">Producto:</span> <span className="font-medium">{selectedProduct.nombre}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">SKU:</span> <span className="font-mono">{selectedProduct.sku}</span></p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Pasillo</TableHead>
                    <TableHead className="text-xs">Estante</TableHead>
                    <TableHead className="text-xs">Nivel</TableHead>
                    <TableHead className="text-xs text-right">Cantidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const stocks = stockEntries.filter((s) => s.idProducto === selectedProduct.id)
                    if (stocks.length === 0) return <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Sin stock</TableCell></TableRow>
                    return stocks.map((s) => (
                      <TableRow key={s.idUbicacion}>
                        <TableCell className="text-xs py-2">{s.ubicacion.pasillo}</TableCell>
                        <TableCell className="text-xs py-2">{s.ubicacion.estante}</TableCell>
                        <TableCell className="text-xs py-2">{s.ubicacion.nivel}</TableCell>
                        <TableCell className="text-xs text-right font-mono py-2">{s.cantidad}</TableCell>
                      </TableRow>
                    ))
                  })()}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ajuste Dialog */}
      <Dialog open={!!ajusteProduct} onOpenChange={(open) => { if (!open) setAjusteProduct(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="dialog-header-accent"><DialogTitle>Ajustar Stock</DialogTitle><DialogDescription>Modificar la cantidad de stock del producto</DialogDescription></DialogHeader>
          {ajusteProduct && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Producto</Label>
                <p className="text-sm font-medium">{ajusteProduct.nombre}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Stock Actual</Label>
                <p className="text-sm font-mono">{ajusteProduct.totalStock}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Nuevo Stock</Label>
                <Input type="number" min="0" value={ajusteStock} onChange={(e) => setAjusteStock(e.target.value)} placeholder="Nueva cantidad" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Motivo (opcional)</Label>
                <Input value={ajusteMotivo} onChange={(e) => setAjusteMotivo(e.target.value)} placeholder="Razón del ajuste" />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setAjusteProduct(null)} disabled={ajusteLoading}>Cancelar</Button>
                <Button onClick={submitAjuste} disabled={ajusteLoading}>
                  {ajusteLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Guardar Ajuste
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Traslado Dialog */}
      <Dialog open={!!trasladoProduct} onOpenChange={(open) => { if (!open) setTrasladoProduct(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="dialog-header-accent"><DialogTitle>Trasladar Stock</DialogTitle><DialogDescription>Mover stock entre ubicaciones</DialogDescription></DialogHeader>
          {trasladoProduct && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Producto</Label>
                <p className="text-sm font-medium">{trasladoProduct.nombre}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Ubicación Origen</Label>
                <Select value={trasladoOrigen} onValueChange={(v) => { setTrasladoOrigen(v); setTrasladoCantidad('') }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar origen" /></SelectTrigger>
                  <SelectContent>
                    {trasladoProduct.stocks.filter((s) => s.cantidad > 0).map((s) => (
                      <SelectItem key={s.idUbicacion} value={String(s.idUbicacion)}>
                        {s.ubicacion.pasillo}-{s.ubicacion.estante}-{s.ubicacion.nivel} ({s.cantidad})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Ubicación Destino</Label>
                <Select value={trasladoDestino} onValueChange={setTrasladoDestino}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar destino" /></SelectTrigger>
                  <SelectContent>
                    {allLocations.map((loc: any) => (
                      <SelectItem key={loc.id} value={String(loc.id)} disabled={String(loc.id) === trasladoOrigen}>
                        {loc.pasillo}-{loc.estante}-{loc.nivel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Cantidad (máx: {getOrigenStock()})</Label>
                <Input type="number" min="1" max={getOrigenStock()} value={trasladoCantidad} onChange={(e) => setTrasladoCantidad(e.target.value)} placeholder="Cantidad a trasladar" />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setTrasladoProduct(null)} disabled={trasladoLoading}>Cancelar</Button>
                <Button onClick={submitTraslado} disabled={trasladoLoading}>
                  {trasladoLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Trasladar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Detail Sheet */}
      <Sheet open={!!sheetProduct} onOpenChange={(open) => { if (!open) setSheetProduct(null) }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="dialog-header-accent">
            <SheetTitle>Detalle de Producto</SheetTitle>
            <SheetDescription>Información completa del producto</SheetDescription>
          </SheetHeader>
          {sheetProduct && (
            <div className="space-y-6 mt-4">
              {/* Product Info */}
              <div className="space-y-2">
                <h3 className="text-base font-semibold">{sheetProduct.nombre}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">SKU:</span> <span className="font-mono">{sheetProduct.sku}</span></div>
                  <div><span className="text-muted-foreground">Categoría:</span> {sheetProduct.categoria?.nombre ?? '-'}</div>
                  <div><span className="text-muted-foreground">Marca:</span> {sheetProduct.marca?.nombre ?? '-'}</div>
                  <div><span className="text-muted-foreground">Unidad:</span> {sheetProduct.unidadMedida ?? 'unidad'}</div>
                  <div><span className="text-muted-foreground">Costo:</span> {formatCurrency(sheetProduct.costoUnitario)}</div>
                  <div><span className="text-muted-foreground">Precio Venta:</span> <span className="font-semibold">{formatCurrency(sheetProduct.precioVenta)}</span></div>
                </div>
                {sheetProduct.descripcion && (
                  <p className="text-xs text-muted-foreground mt-1">{sheetProduct.descripcion}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={sheetProduct.status} />
                  <Badge variant="outline" className="text-[10px]">
                    Stock Total: <span className="font-mono font-semibold">{sheetProduct.totalStock}</span>
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Mínimo: <span className="font-mono">{sheetProduct.stockMinimo}</span>
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Stock by Location - Visual Bars */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Stock por Ubicación
                </h4>
                {sheetProduct.stocks.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-xs">
                    <Package className="h-8 w-8 mx-auto mb-1 opacity-30" />
                    <p>Sin stock registrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sheetProduct.stocks.map((s) => {
                      const maxStock = getMaxStock()
                      const pct = Math.round((s.cantidad / maxStock) * 100)
                      return (
                        <div key={s.idUbicacion} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-muted-foreground">
                              {s.ubicacion.pasillo}-{s.ubicacion.estante}-{s.ubicacion.nivel}
                            </span>
                            <span className="font-mono font-semibold">{s.cantidad}</span>
                          </div>
                          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                s.cantidad === 0 ? 'bg-red-500' :
                                s.cantidad < sheetProduct.stockMinimo ? 'bg-amber-500' :
                                'bg-emerald-500'
                              )}
                              style={{ width: `${Math.max(2, pct)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                    {sheetProduct.stockMinimo > 0 && (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                        <div className="h-1 w-3 bg-amber-500 rounded" />
                        <span>Línea de mínimo ({sheetProduct.stockMinimo})</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Recent Movements */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Últimos Movimientos
                </h4>
                {productMovements.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin movimientos registrados</p>
                ) : (
                  <ScrollArea className="max-h-48">
                    <div className="space-y-1">
                      {productMovements.slice(0, 5).map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            <span className={cn('inline-block px-1.5 py-0 rounded text-[10px] font-semibold', tipoMovColors[m.tipoMovimiento?.nombre] ?? 'bg-gray-100 text-gray-800')}>
                              {m.tipoMovimiento?.nombre}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {m.ubicacion ? `${m.ubicacion.pasillo}-${m.ubicacion.estante}` : '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn('text-xs font-mono font-semibold',
                              m.tipoMovimiento?.nombre === 'ENTRADA' || m.tipoMovimiento?.nombre === 'DEVOLUCION'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            )}>
                              {m.tipoMovimiento?.nombre === 'ENTRADA' || m.tipoMovimiento?.nombre === 'DEVOLUCION' ? '+' : '-'}{m.cantidad}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{formatDateTime(m.fecha)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <Separator />

              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Acciones Rápidas</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={quickAdjust}>
                    <SlidersHorizontal className="h-3.5 w-3.5 mr-1" /> Ajustar Stock
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={quickTransfer} disabled={sheetProduct.stocks.length <= 1}>
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Transferir
                  </Button>
                  <Button size="sm" className="text-xs col-span-2" onClick={quickGoToReceiving}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Ir a Recepción
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
