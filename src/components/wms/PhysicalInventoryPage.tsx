'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ClipboardCheck, RotateCcw, Save, Search } from 'lucide-react'

interface StockLocation {
  idUbicacion: number
  ubicacion: string
  cantidadSistema: number
}

interface InventoryProduct {
  idProducto: number
  sku: string
  nombre: string
  categoria: string | null
  marca: string | null
  ubicaciones: StockLocation[]
  totalSistema: number
}

export function PhysicalInventoryPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [countedItems, setCountedItems] = useState<Record<string, number>>({})
  const [notasItems, setNotasItems] = useState<Record<string, string>>({})

  const { data: productos = [], isLoading } = useQuery<InventoryProduct[]>({
    queryKey: ['inventario-fisico'],
    queryFn: () => fetch('/api/wms/inventario-fisico').then((r) => r.json()),
  })

  const filtered = useMemo(() => {
    if (!search) return productos
    const s = search.toLowerCase()
    return productos.filter(
      (p) =>
        p.sku.toLowerCase().includes(s) ||
        p.nombre.toLowerCase().includes(s) ||
        (p.categoria ?? '').toLowerCase().includes(s) ||
        (p.marca ?? '').toLowerCase().includes(s)
    )
  }, [productos, search])

  // Flatten products + locations into rows
  const rows = useMemo(() => {
    const r: (InventoryProduct & { idUbicacion: number; ubicacion: string; cantidadSistema: number; rowKey: string })[] = []
    for (const p of filtered) {
      if (p.ubicaciones.length === 0) {
        r.push({
          ...p,
          idUbicacion: 0,
          ubicacion: 'Sin ubicación',
          cantidadSistema: 0,
          rowKey: `${p.idProducto}-0`,
        })
      } else {
        for (const u of p.ubicaciones) {
          r.push({
            ...p,
            idUbicacion: u.idUbicacion,
            ubicacion: u.ubicacion,
            cantidadSistema: u.cantidadSistema,
            rowKey: `${p.idProducto}-${u.idUbicacion}`,
          })
        }
      }
    }
    return r
  }, [filtered])

  const summary = useMemo(() => {
    const totalProductos = productos.length
    const contados = Object.keys(countedItems).filter((k) => countedItems[k] !== undefined && countedItems[k] !== null).length
    const conVarianza = Object.entries(countedItems).filter(([k, v]) => {
      if (v === undefined || v === null) return false
      const row = rows.find((r) => r.rowKey === k)
      return row && v !== row.cantidadSistema
    }).length
    return { totalProductos, contados, conVarianza }
  }, [productos, countedItems, rows])

  const saveMutation = useMutation({
    mutationFn: () => {
      const items = Object.entries(countedItems)
        .filter(([k, v]) => v !== undefined && v !== null)
        .map(([k, v]) => {
          const [idProd, idUb] = k.split('-')
          return {
            idProducto: parseInt(idProd, 10),
            idUbicacion: parseInt(idUb, 10),
            cantidadContada: v,
            notas: notasItems[k] || undefined,
          }
        })
      return fetch('/api/wms/inventario-fisico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      }).then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() })
    },
    onSuccess: (data) => {
      toast.success(
        `Conteo guardado: ${data.totalItems} contados, ${data.itemsWithVariance} con varianza, ${data.movementsCreated} ajustes creados`
      )
      queryClient.invalidateQueries({ queryKey: ['inventario-fisico'] })
      setCountedItems({})
      setNotasItems({})
    },
    onError: (err: any) => toast.error(err.error ?? 'Error al guardar conteo'),
  })

  function handleCountChange(rowKey: string, value: string) {
    const num = value === '' ? undefined : parseInt(value, 10)
    setCountedItems((prev) => {
      const next = { ...prev }
      if (num === undefined || isNaN(num)) {
        delete next[rowKey]
      } else {
        next[rowKey] = num
      }
      return next
    })
  }

  function handleNotasChange(rowKey: string, value: string) {
    setNotasItems((prev) => ({ ...prev, [rowKey]: value }))
  }

  function handleReset() {
    setCountedItems({})
    setNotasItems({})
  }

  function getVariance(rowKey: string, sistema: number): number | null {
    const counted = countedItems[rowKey]
    if (counted === undefined || counted === null) return null
    return counted - sistema
  }

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <p className="text-sm text-muted-foreground">Conteo físico de inventario — verificar stock real del almacén</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Productos</p>
            <p className="text-2xl font-bold mt-1">{summary.totalProductos}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Contados</p>
            <p className="text-2xl font-bold mt-1 text-primary">{summary.contados}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Con Varianza</p>
            <p className={summary.conVarianza > 0 ? 'text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400' : 'text-2xl font-bold mt-1'}>{summary.conVarianza}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por SKU, nombre..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Iniciar Conteo
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || summary.contados === 0}
          >
            <Save className="h-4 w-4 mr-1" />
            {saveMutation.isPending ? 'Guardando...' : 'Guardar Conteo'}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-xs">SKU</TableHead>
                  <TableHead className="text-xs">Producto</TableHead>
                  <TableHead className="text-xs">Ubicación</TableHead>
                  <TableHead className="text-xs text-center">Stock Sistema</TableHead>
                  <TableHead className="text-xs text-center">Cantidad Contada</TableHead>
                  <TableHead className="text-xs text-center">Varianza</TableHead>
                  <TableHead className="text-xs">Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j} className="py-2"><Skeleton className="h-6 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No se encontraron productos
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && rows.map((row, idx) => {
                  const variance = getVariance(row.rowKey, row.cantidadSistema)
                  return (
                    <TableRow key={row.rowKey} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-mono py-2">{row.sku}</TableCell>
                      <TableCell className="text-xs font-medium py-2 max-w-[200px] truncate">{row.nombre}</TableCell>
                      <TableCell className="text-xs py-2">
                        <Badge variant="outline" className="text-[10px]">{row.ubicacion}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-center font-mono py-2 font-semibold">{row.cantidadSistema}</TableCell>
                      <TableCell className="text-xs text-center py-2">
                        <Input
                          type="number"
                          min={0}
                          className="w-20 mx-auto text-center h-8 text-xs"
                          value={countedItems[row.rowKey] ?? ''}
                          onChange={(e) => handleCountChange(row.rowKey, e.target.value)}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-xs text-center py-2">
                        {variance === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : variance === 0 ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]">0</Badge>
                        ) : variance > 0 ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]">+{variance}</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">{variance}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        <Input
                          className="h-8 text-xs"
                          placeholder="Notas..."
                          value={notasItems[row.rowKey] ?? ''}
                          onChange={(e) => handleNotasChange(row.rowKey, e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
