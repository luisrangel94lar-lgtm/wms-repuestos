'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, MapPin } from 'lucide-react'
import { formatCurrency } from './lib/format'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

interface StockEntry {
  idProducto: number
  idUbicacion: number
  cantidad: number
  producto: { id: number; sku: string; nombre: string; costoUnitario: number; precioVenta: number; stockMinimo: number }
  ubicacion: { id: number; pasillo: string; estante: string; nivel: string }
}

export function InventoryPage() {
  const [selectedProduct, setSelectedProduct] = useState<StockEntry['producto'] | null>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-inventory'],
    queryFn: () => fetch('/api/wms/productos?pageSize=500').then((r) => r.json()).then((d: any) => d.items ?? []),
  })

  const { data: stockEntries = [] } = useQuery<StockEntry[]>({
    queryKey: ['all-stock-inv'],
    queryFn: () => fetch('/api/wms/stock').then((r) => r.json()),
  })

  // Build inventory view
  const inventory = products.map((p: any) => {
    const stocks = stockEntries.filter((s) => s.idProducto === p.id)
    const totalStock = stocks.reduce((sum, s) => sum + s.cantidad, 0)
    const valorTotal = totalStock * p.costoUnitario
    let status: 'ok' | 'low' | 'out' = 'ok'
    if (totalStock === 0) status = 'out'
    else if (totalStock < p.stockMinimo) status = 'low'
    return { ...p, totalStock, valorTotal, status, stocks }
  })

  const totalValor = inventory.reduce((sum, p) => sum + p.valorTotal, 0)

  function StatusBadge({ status }: { status: string }) {
    if (status === 'out') return <Badge variant="destructive" className="text-[10px]">Sin Stock</Badge>
    if (status === 'low') return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-[10px]">Bajo</Badge>
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]">OK</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {inventory.length} productos · Valor total: <span className="font-semibold text-foreground">{formatCurrency(totalValor)}</span>
          </p>
        </div>
        <Button variant="outline" onClick={() => toast.success('Exportación no disponible aún')}>
          <Download className="h-4 w-4 mr-1" /> Exportar
        </Button>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Producto</TableHead>
                  <TableHead className="text-xs">SKU</TableHead>
                  <TableHead className="text-xs text-center">Total Stock</TableHead>
                  <TableHead className="text-xs text-right">Valor Total</TableHead>
                  <TableHead className="text-xs text-center">Estado</TableHead>
                  <TableHead className="text-xs text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && inventory.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin productos en inventario</TableCell></TableRow>
                )}
                {!isLoading && inventory.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-medium py-2 max-w-[200px] truncate">{p.nombre}</TableCell>
                    <TableCell className="text-xs font-mono py-2">{p.sku}</TableCell>
                    <TableCell className="text-xs text-center font-mono py-2">{p.totalStock}</TableCell>
                    <TableCell className="text-xs text-right py-2">{formatCurrency(p.valorTotal)}</TableCell>
                    <TableCell className="text-xs text-center py-2"><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-xs text-right py-2">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedProduct(p)}>
                        <MapPin className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stock by location dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => { if (!open) setSelectedProduct(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Stock por Ubicación</DialogTitle></DialogHeader>
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
    </div>
  )
}
