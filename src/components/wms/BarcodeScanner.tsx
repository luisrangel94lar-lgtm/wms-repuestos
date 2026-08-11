'use client'

import { useState } from 'react'
import { useWmsStore } from '@/store/wms'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Barcode, ScanLine, Eye, Download, Loader2, MapPin } from 'lucide-react'
import { formatCurrency } from './lib/format'

interface BarcodeResult {
  id: number
  sku: string
  nombre: string
  descripcion: string | null
  codigoBarras: string | null
  unidadMedida: string
  costoUnitario: number
  precioVenta: number
  stockMinimo: number
  categoria: { id: number; nombre: string } | null
  marca: { id: number; nombre: string } | null
  stocks: {
    idProducto: number
    idUbicacion: number
    cantidad: number
    ubicacion: { id: number; pasillo: string; estante: string; nivel: string }
  }[]
  totalStock: number
}

interface BarcodeScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BarcodeScanner({ open, onOpenChange }: BarcodeScannerProps) {
  const { setCurrentPage, setReceivingProductId } = useWmsStore()
  const [barcode, setBarcode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BarcodeResult | null>(null)
  const [notFound, setNotFound] = useState(false)

  async function searchBarcode() {
    const code = barcode.trim()
    if (!code) return

    setLoading(true)
    setNotFound(false)
    setResult(null)

    try {
      const res = await fetch(`/api/wms/productos/barcode?barcode=${encodeURIComponent(code)}`)
      const data = await res.json()

      if (!res.ok) {
        setNotFound(true)
        toast.error(data.error || 'Producto no encontrado')
        return
      }

      setResult(data as BarcodeResult)
    } catch {
      toast.error('Error al buscar código de barras')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      searchBarcode()
    }
  }

  function handleClose() {
    setBarcode('')
    setResult(null)
    setNotFound(false)
    onOpenChange(false)
  }

  function goToReceiving() {
    if (result) {
      const deficiency = result.stockMinimo - result.totalStock
      setReceivingProductId(result.id, deficiency > 0 ? deficiency : null)
      setCurrentPage('receiving')
      handleClose()
    }
  }

  function goToProduct() {
    if (result) {
      setCurrentPage('products')
      handleClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="dialog-header-accent">
          <DialogTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" /> Búsqueda por Código de Barras
          </DialogTitle>
          <DialogDescription>Escanee o ingrese el código de barras del producto</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barcode input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanLine className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                autoFocus
                placeholder="Escanear o escribir código..."
                className="pl-9 h-10 font-mono"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={searchBarcode} disabled={loading || !barcode.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Barcode className="h-4 w-4" />}
            </Button>
          </div>

          {/* Not found */}
          {notFound && !loading && (
            <div className="text-center py-6 text-muted-foreground">
              <Barcode className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No se encontró producto con ese código</p>
            </div>
          )}

          {/* Result card */}
          {result && (
            <Card className="rounded-xl shadow-sm border">
              <CardContent className="p-4 space-y-3">
                {/* Product header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{result.nombre}</p>
                    <p className="text-xs text-muted-foreground font-mono">{result.sku}</p>
                  </div>
                  <Badge
                    variant={result.totalStock === 0 ? 'destructive' : result.totalStock < result.stockMinimo ? 'outline' : 'default'}
                    className="text-[10px] shrink-0 ml-2"
                  >
                    {result.totalStock === 0 ? 'Sin Stock' : result.totalStock < result.stockMinimo ? 'Bajo' : 'OK'}
                  </Badge>
                </div>

                {/* Product details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {result.categoria && (
                    <div><span className="text-muted-foreground">Categoría:</span> {result.categoria.nombre}</div>
                  )}
                  {result.marca && (
                    <div><span className="text-muted-foreground">Marca:</span> {result.marca.nombre}</div>
                  )}
                  <div><span className="text-muted-foreground">Precio Venta:</span> <span className="font-semibold">{formatCurrency(result.precioVenta)}</span></div>
                  <div><span className="text-muted-foreground">Unidad:</span> {result.unidadMedida}</div>
                </div>

                {/* Stock total bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Stock Total</span>
                    <span className="font-mono font-semibold text-sm">{result.totalStock}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={
                        result.totalStock === 0
                          ? 'h-full bg-red-500 rounded-full'
                          : result.totalStock < result.stockMinimo
                            ? 'h-full bg-amber-500 rounded-full'
                            : 'h-full bg-emerald-500 rounded-full'
                      }
                      style={{ width: `${Math.min(100, (result.totalStock / Math.max(1, result.stockMinimo * 2)) * 100)}%` }}
                    />
                  </div>
                  {result.stockMinimo > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">Mínimo: {result.stockMinimo}</p>
                  )}
                </div>

                {/* Stock by location */}
                {result.stocks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Ubicaciones con stock
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px]">Ubicación</TableHead>
                          <TableHead className="text-[10px] text-right">Cant.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.stocks.map((s) => (
                          <TableRow key={s.idUbicacion}>
                            <TableCell className="text-xs font-mono py-1">
                              {s.ubicacion.pasillo}-{s.ubicacion.estante}-{s.ubicacion.nivel}
                            </TableCell>
                            <TableCell className="text-xs font-mono py-1 text-right">{s.cantidad}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Quick actions */}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={goToProduct}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Ver Producto
                  </Button>
                  <Button size="sm" className="flex-1 text-xs" onClick={goToReceiving}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Ir a Recepción
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
