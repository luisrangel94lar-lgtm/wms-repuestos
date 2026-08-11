'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, ShoppingCart, Eye, Printer, XCircle, ClipboardList, MapPin, Target } from 'lucide-react'
import { formatCurrency, formatDate, formatDateTime } from './lib/format'
import { SortableHeader } from './lib/SortableHeader'
import { printReceipt, getWarehouseSettings } from './lib/print-receipt'

interface SaleLine {
  idProducto: number
  nombre: string
  sku: string
  precioUnitario: number
  cantidad: number
}

export function SalesPage() {
  const queryClient = useQueryClient()

  const { data: salesSummary } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => fetch('/api/wms/dashboard').then(r => r.json()).then(d => ({
      hoy: d.ventasHoy,
      semana: d.ventasSemana,
      mes: d.ventasMes,
    })),
  })

  const [showCreate, setShowCreate] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [lineQty, setLineQty] = useState(1)
  const [lines, setLines] = useState<SaleLine[]>([])
  const [viewId, setViewId] = useState<number | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [pickingId, setPickingId] = useState<number | null>(null)

  // Sorting state
  const [sortField, setSortField] = useState<string>('fecha')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-sales'],
    queryFn: () => fetch('/api/wms/clientes').then((r) => r.json()),
    enabled: showCreate,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products-sales'],
    queryFn: () => fetch('/api/wms/productos?pageSize=500').then((r) => r.json()).then((d: any) => d.items ?? []),
    enabled: showCreate,
  })

  const { data: ventas = [], isLoading } = useQuery({
    queryKey: ['ventas'],
    queryFn: () => fetch('/api/wms/ventas').then((r) => r.json()),
  })

  const { data: viewVenta } = useQuery({
    queryKey: ['venta-detail', viewId],
    queryFn: () => fetch(`/api/wms/ventas/${viewId}`).then((r) => r.json()),
    enabled: !!viewId,
  })

  const { data: pickingData } = useQuery({
    queryKey: ['picking-list', pickingId],
    queryFn: () => fetch(`/api/wms/ventas/${pickingId}/picking`).then((r) => r.json()),
    enabled: !!pickingId,
  })

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedCliente) return Promise.reject({ error: 'Seleccione un cliente' })
      if (lines.length === 0) return Promise.reject({ error: 'Agregue productos' })
      return fetch('/api/wms/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idCliente: Number(selectedCliente),
          detalles: lines.map((l) => ({ idProducto: l.idProducto, cantidad: l.cantidad, precioUnitario: l.precioUnitario })),
        }),
      }).then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() })
    },
    onSuccess: () => {
      toast.success('Venta registrada correctamente')
      queryClient.invalidateQueries({ queryKey: ['ventas'] })
      queryClient.invalidateQueries({ queryKey: ['products-inventory'] })
      setShowCreate(false)
      setSelectedCliente('')
      setLines([])
    },
    onError: (err: any) => toast.error(err.error ?? 'Error al registrar venta'),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/wms/ventas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'CANCELADA' }),
      }).then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() }),
    onSuccess: () => {
      toast.success('Venta cancelada correctamente')
      queryClient.invalidateQueries({ queryKey: ['ventas'] })
      queryClient.invalidateQueries({ queryKey: ['venta-detail', viewId] })
      queryClient.invalidateQueries({ queryKey: ['products-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['movimientos'] })
      setCancelId(null)
      setViewId(null)
    },
    onError: (err: any) => toast.error(err.error ?? 'Error al cancelar venta'),
  })

  function addLine() {
    const prod = products.find((p: any) => p.id === Number(selectedProduct))
    if (!prod) return
    const existing = lines.find((l) => l.idProducto === prod.id)
    if (existing) {
      setLines(lines.map((l) => l.idProducto === prod.id ? { ...l, cantidad: l.cantidad + lineQty } : l))
    } else {
      setLines([...lines, { idProducto: prod.id, nombre: prod.nombre, sku: prod.sku, precioUnitario: prod.precioVenta, cantidad: lineQty }])
    }
    setSelectedProduct('')
    setLineQty(1)
  }

  function removeLine(idProducto: number) {
    setLines(lines.filter((l) => l.idProducto !== idProducto))
  }

  const subtotal = lines.reduce((sum, l) => sum + l.precioUnitario * l.cantidad, 0)

  // --- Sorting ---
  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function getSaleSortValue(v: any, field: string): any {
    if (field === 'cliente') return v.cliente?.nombre ?? ''
    return v[field]
  }

  const sortedVentas = [...ventas].sort((a: any, b: any) => {
    let aVal: any = getSaleSortValue(a, sortField)
    let bVal: any = getSaleSortValue(b, sortField)
    if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal as string).toLowerCase() }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="space-y-4">
      {/* Stats Bar with Daily Goal Progress */}
      <div className="flex flex-wrap gap-3 items-stretch">
        <Card className="card-hover rounded-lg px-4 py-2.5 shadow-sm border">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Ventas Hoy</p>
              <p className="text-lg font-bold">{formatCurrency(salesSummary?.hoy?.total ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground">{salesSummary?.hoy?.count ?? 0} venta(s)</p>
            </div>
          </div>
        </Card>
        <Card className="card-hover rounded-lg px-4 py-2.5 shadow-sm border flex-1 min-w-[220px]">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground uppercase">Meta Diaria: $5,000</p>
              <div className="w-full bg-muted rounded-full h-2 mt-1">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, ((salesSummary?.hoy?.total ?? 0) / 5000) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{Math.min(100, Math.round(((salesSummary?.hoy?.total ?? 0) / 5000) * 100))}% completado</p>
            </div>
          </div>
        </Card>
        <Card className="card-hover rounded-lg px-4 py-2.5 shadow-sm border">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Semana</p>
            <p className="text-base font-bold">{formatCurrency(salesSummary?.semana?.total ?? 0)}</p>
          </div>
        </Card>
        <Card className="card-hover rounded-lg px-4 py-2.5 shadow-sm border">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Mes</p>
            <p className="text-base font-bold">{formatCurrency(salesSummary?.mes?.total ?? 0)}</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nueva Venta
        </Button>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Registro de ventas a técnicos con tracking de stock</p>
      </div>

      {/* Sales table */}
      <Card className="rounded-xl shadow-sm transition-all duration-200">
        <CardContent className="p-0">
          <div className="table-container max-h-[calc(100vh-14rem)] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="folio" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Folio</SortableHeader>
                  <SortableHeader field="fecha" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Fecha</SortableHeader>
                  <SortableHeader field="cliente" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Cliente</SortableHeader>
                  <TableHead className="text-xs text-right hidden md:table-cell">Subtotal</TableHead>
                  <SortableHeader field="total" align="right" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Total</SortableHeader>
                  <SortableHeader field="estado" align="center" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Estado</SortableHeader>
                  <TableHead className="text-xs text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && sortedVentas.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-12">
                    <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm">No hay ventas registradas</p>
                    <p className="text-muted-foreground/60 text-xs mt-1">Registra tu primera venta desde el botón "Nueva Venta"</p>
                  </TableCell></TableRow>
                )}
                {!isLoading && sortedVentas.map((v: any) => (
                  <TableRow key={v.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-mono py-2">{v.folio}</TableCell>
                    <TableCell className="text-xs py-2">{formatDate(v.fecha)}</TableCell>
                    <TableCell className="text-xs font-medium py-2">{v.cliente?.nombre}</TableCell>
                    <TableCell className="text-xs text-right py-2 hidden md:table-cell">{formatCurrency(v.subtotal ?? 0)}</TableCell>
                    <TableCell className="text-xs text-right py-2 font-medium">{formatCurrency(v.total ?? 0)}</TableCell>
                    <TableCell className="text-xs text-center py-2">
                      <Badge variant={v.estado === 'COMPLETADA' ? 'default' : 'outline'} className="text-[10px]">{v.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right py-2">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewId(v.id)}><Eye className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create sale dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); setLines([]); setSelectedCliente('') } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="dialog-header-accent"><DialogTitle>Nueva Venta</DialogTitle><DialogDescription className="sr-only">Formulario para registrar una nueva venta</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cliente *</Label>
              <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <p className="text-sm font-medium">Productos</p>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Producto</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Buscar producto" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.sku} - {p.nombre} ({formatCurrency(p.precioVenta)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">Cant.</Label>
                  <Input type="number" min={1} className="h-9" value={lineQty} onChange={(e) => setLineQty(Number(e.target.value))} />
                </div>
                <Button type="button" variant="outline" size="sm" className="h-9" onClick={addLine} disabled={!selectedProduct}><Plus className="h-4 w-4" /></Button>
              </div>

              {lines.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead className="text-xs">Producto</TableHead><TableHead className="text-xs text-center">Cant.</TableHead><TableHead className="text-xs text-right">Precio</TableHead><TableHead className="text-xs text-right">Importe</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {lines.map((l) => (
                      <TableRow key={l.idProducto}>
                        <TableCell className="text-xs py-1.5">{l.nombre}</TableCell>
                        <TableCell className="text-xs text-center font-mono py-1.5">{l.cantidad}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{formatCurrency(l.precioUnitario)}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{formatCurrency(l.precioUnitario * l.cantidad)}</TableCell>
                        <TableCell className="py-1.5"><Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeLine(l.idProducto)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="flex justify-end text-sm font-semibold">
              Total: {formatCurrency(subtotal)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setLines([]); setSelectedCliente('') }}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !selectedCliente || lines.length === 0}>
              {createMutation.isPending ? 'Registrando...' : 'Registrar Venta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View sale detail dialog */}
      <Dialog open={!!viewId} onOpenChange={(open) => { if (!open) setViewId(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="dialog-header-accent"><DialogTitle>Detalle de Venta</DialogTitle><DialogDescription className="sr-only">Detalle de la venta seleccionada</DialogDescription></DialogHeader>
          {viewVenta && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Folio:</span> <span className="font-mono font-medium">{viewVenta.folio}</span></div>
                <div><span className="text-muted-foreground">Fecha:</span> {formatDate(viewVenta.fecha)}</div>
                <div><span className="text-muted-foreground">Cliente:</span> {viewVenta.cliente?.nombre}</div>
                <div><span className="text-muted-foreground">Estado:</span> <Badge variant={viewVenta.estado === 'COMPLETADA' ? 'default' : 'outline'} className="text-[10px]">{viewVenta.estado}</Badge></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead className="text-xs">Producto</TableHead><TableHead className="text-xs text-center">Cant.</TableHead><TableHead className="text-xs text-right">Precio</TableHead><TableHead className="text-xs text-right">Importe</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(viewVenta.detalles ?? []).map((d: any) => (
                    <TableRow key={d.idProducto}>
                      <TableCell className="text-xs py-1.5">{d.producto?.nombre}</TableCell>
                      <TableCell className="text-xs text-center font-mono py-1.5">{d.cantidad}</TableCell>
                      <TableCell className="text-xs text-right py-1.5">{formatCurrency(d.precioUnitario)}</TableCell>
                      <TableCell className="text-xs text-right py-1.5">{formatCurrency(d.precioUnitario * d.cantidad)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                <span>Total:</span>
                <span>{formatCurrency(viewVenta.total ?? 0)}</span>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                {viewVenta.estado === 'COMPLETADA' && (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setCancelId(viewVenta.id)}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar Venta
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setPickingId(viewVenta.id)}
                    >
                      <ClipboardList className="h-3.5 w-3.5 mr-1" /> Generar Lista de Picking
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const warehouse = getWarehouseSettings()
                    printReceipt({
                      warehouseName: warehouse.name,
                      warehouseAddress: warehouse.address,
                      warehousePhone: warehouse.phone,
                      folio: viewVenta.folio,
                      fecha: formatDateTime(viewVenta.fecha),
                      cliente: { nombre: viewVenta.cliente?.nombre ?? 'N/A', telefono: viewVenta.cliente?.telefono },
                      detalles: (viewVenta.detalles ?? []).map((d: any) => ({
                        producto: d.producto ? { nombre: d.producto.nombre, sku: d.producto.sku } : null,
                        cantidad: d.cantidad,
                        precioUnitario: d.precioUnitario,
                      })),
                      subtotal: viewVenta.subtotal ?? viewVenta.total ?? 0,
                      total: viewVenta.total ?? 0,
                      estado: viewVenta.estado,
                    })
                  }}
                >
                  <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Picking List Dialog */}
      <Dialog open={!!pickingId} onOpenChange={(open) => { if (!open) setPickingId(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="dialog-header-accent">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Lista de Picking
            </DialogTitle>
            <DialogDescription className="sr-only">Lista de recolección de productos para la venta</DialogDescription>
          </DialogHeader>
          {pickingData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm bg-muted/50 rounded-lg p-3">
                <div><span className="text-muted-foreground">Folio:</span> <span className="font-mono font-medium">{pickingData.folio}</span></div>
                <div><span className="text-muted-foreground">Fecha:</span> {formatDate(pickingData.fecha)}</div>
                <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{pickingData.cliente?.nombre}</span></div>
              </div>
              <div id="picking-print-content">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-8">#</TableHead>
                      <TableHead className="text-xs">Producto</TableHead>
                      <TableHead className="text-xs">SKU</TableHead>
                      <TableHead className="text-xs text-center">Cant. Necesaria</TableHead>
                      <TableHead className="text-xs">Recoger De</TableHead>
                      <TableHead className="text-xs text-center">Disponible</TableHead>
                      <TableHead className="text-xs text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pickingData.items.map((item: any, idx: number) => (
                      <TableRow key={item.idProducto} className={!item.suficiente ? 'bg-red-50/50 dark:bg-red-950/20' : ''}>
                        <TableCell className="text-xs font-mono py-2">{idx + 1}</TableCell>
                        <TableCell className="text-xs font-medium py-2">{item.producto.nombre}</TableCell>
                        <TableCell className="text-xs font-mono py-2">{item.producto.sku}</TableCell>
                        <TableCell className="text-xs text-center font-mono py-2 font-semibold">{item.cantidadNecesaria}</TableCell>
                        <TableCell className="text-xs py-2">
                          {item.ubicaciones.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {item.ubicaciones.map((loc: any) => (
                                <span key={loc.idUbicacion} className="flex items-center gap-1 font-mono">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  {loc.codigo}
                                  <span className="text-muted-foreground">({loc.cantidad})</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin ubicación</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-center font-mono py-2">{item.cantidadDisponible}</TableCell>
                        <TableCell className="text-xs text-center py-2">
                          {item.suficiente ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]">OK</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">INSUFICIENTE</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const printContent = document.getElementById('picking-print-content')
                    if (!printContent) return
                    const win = window.open('', '_blank')
                    if (!win) return
                    win.document.write(`
                      <html><head><title>Lista de Picking - ${pickingData.folio}</title></head><body>
                      <h2 style="text-align:center">Lista de Picking</h2>
                      <p><strong>Folio:</strong> ${pickingData.folio} &nbsp; <strong>Fecha:</strong> ${formatDate(pickingData.fecha)} &nbsp; <strong>Cliente:</strong> ${pickingData.cliente?.nombre}</p>
                      <hr/>
                      ${printContent.innerHTML}
                      </body></html>
                    `)
                    win.document.close()
                    win.print()
                  }}
                >
                  <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir Picking
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPickingId(null)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel sale confirmation dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={(open) => { if (!open) setCancelId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se revertirá el stock y se cambiará el estado a CANCELADA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelId && cancelMutation.mutate(cancelId)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Sí, cancelar venta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
