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
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, ShoppingCart, Eye, Printer } from 'lucide-react'
import { formatCurrency, formatDate, formatDateTime } from './lib/format'

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nueva Venta
        </Button>
        <div className="flex gap-2 ml-auto">
          <Badge variant="outline" className="text-xs">Hoy: {formatCurrency(salesSummary?.hoy?.total ?? 0)} ({salesSummary?.hoy?.count ?? 0})</Badge>
          <Badge variant="outline" className="text-xs">Semana: {formatCurrency(salesSummary?.semana?.total ?? 0)}</Badge>
          <Badge variant="outline" className="text-xs">Mes: {formatCurrency(salesSummary?.mes?.total ?? 0)}</Badge>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Registro de ventas a técnicos con tracking de stock</p>
      </div>

      {/* Sales table */}
      <Card className="rounded-xl shadow-sm transition-all duration-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Folio</TableHead>
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Subtotal</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs text-center">Estado</TableHead>
                  <TableHead className="text-xs text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && ventas.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin ventas registradas</TableCell></TableRow>
                )}
                {!isLoading && ventas.map((v: any) => (
                  <TableRow key={v.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-mono py-2">{v.folio}</TableCell>
                    <TableCell className="text-xs py-2">{formatDate(v.fecha)}</TableCell>
                    <TableCell className="text-xs font-medium py-2">{v.cliente?.nombre}</TableCell>
                    <TableCell className="text-xs text-right py-2 hidden sm:table-cell">{formatCurrency(v.subtotal ?? 0)}</TableCell>
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
          <DialogHeader><DialogTitle>Nueva Venta</DialogTitle><DialogDescription className="sr-only">Formulario para registrar una nueva venta</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
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
          <DialogHeader><DialogTitle>Detalle de Venta</DialogTitle><DialogDescription className="sr-only">Detalle de la venta seleccionada</DialogDescription></DialogHeader>
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
              <div className="flex justify-end pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const win = window.open('', '_blank', 'width=400,height=600')
                    if (win && viewVenta) {
                      win.document.write(`
                        <html><head><title>Venta ${viewVenta.folio}</title>
                        <style>body{font-family:monospace;padding:20px;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;text-align:left}th{background:#f5f5f5}.total{font-weight:bold;font-size:14px;text-align:right;padding-top:12px}</style>
                        </head><body>
                        <h2>Venta ${viewVenta.folio}</h2>
                        <p>Fecha: ${formatDateTime(viewVenta.fecha)}</p>
                        <p>Cliente: ${viewVenta.cliente?.nombre}</p>
                        <table><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr>
                        ${(viewVenta.detalles ?? []).map((d: any) => `<tr><td>${d.producto?.nombre}</td><td>${d.cantidad}</td><td>$${d.precioUnitario.toFixed(2)}</td><td>$${(d.cantidad * d.precioUnitario).toFixed(2)}</td></tr>`).join('')}
                        </table>
                        <div class="total">TOTAL: $${(viewVenta.total ?? 0).toFixed(2)}</div>
                        <hr><p style="font-size:10px;color:#888">Generado por WMS Repuestos</p>
                        <script>window.print();</script>
                        </body></html>
                      `)
                      win.document.close()
                    }
                  }}
                >
                  <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
