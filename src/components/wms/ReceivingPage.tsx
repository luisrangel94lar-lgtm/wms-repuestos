'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, Plus, Trash2, PackagePlus } from 'lucide-react'
import { formatDateTime, formatCurrency, tipoMovColors } from './lib/format'
import { useWmsStore } from '@/store/wms'

const receivingSchema = z.object({
  idProducto: z.coerce.number().min(1, 'Producto requerido'),
  idUbicacion: z.coerce.number().min(1, 'Ubicación requerida'),
  cantidad: z.coerce.number().min(1, 'Cantidad mínima 1'),
  costoUnitario: z.coerce.number().min(0),
  referencia: z.string().optional(),
  observacion: z.string().optional(),
})

type ReceivingFormData = z.infer<typeof receivingSchema>

interface BatchRow {
  idProducto: number
  idUbicacion: number
  cantidad: number
}

export function ReceivingPage() {
  const queryClient = useQueryClient()
  const { receivingProductId, receivingSuggestedQty, setReceivingProductId } = useWmsStore()

  const { data: tiposMov = [] } = useQuery({
    queryKey: ['tipos-movimiento'],
    queryFn: () => fetch('/api/wms/tipos-movimiento').then((r) => r.json()),
  })

  const entradaTipo = tiposMov.find((t: any) => t.nombre === 'ENTRADA')

  const { data: products = [] } = useQuery({
    queryKey: ['products-receiving'],
    queryFn: () => fetch('/api/wms/productos?pageSize=500').then((r) => r.json()).then((d: any) => d.items ?? []),
  })

  const { data: ubicaciones = [] } = useQuery({
    queryKey: ['ubicaciones-receiving'],
    queryFn: () => fetch('/api/wms/ubicaciones?activos=true').then((r) => r.json()),
  })

  const { data: recentEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['recent-entries'],
    queryFn: () => fetch('/api/wms/movimientos?idTipo=1&limit=10').then(r => r.json()),
  })

  const form = useForm<ReceivingFormData>({
    resolver: zodResolver(receivingSchema) as any,
    defaultValues: { idProducto: 0, idUbicacion: 0, cantidad: 1, costoUnitario: 0, referencia: '', observacion: '' },
  })

  useEffect(() => {
    if (receivingProductId && products.length > 0) {
      form.setValue('idProducto', receivingProductId)
      if (receivingSuggestedQty && receivingSuggestedQty > 0) {
        form.setValue('cantidad', receivingSuggestedQty)
      }
      setReceivingProductId(null)
    }
  }, [receivingProductId, products.length, receivingSuggestedQty, form, setReceivingProductId])

  const createMutation = useMutation({
    mutationFn: (values: ReceivingFormData) => {
      if (!entradaTipo) return Promise.reject({ error: 'Tipo ENTRADA no encontrado' })
      return fetch('/api/wms/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, idTipo: entradaTipo.id, usuario: 'Admin' }),
      }).then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() })
    },
    onSuccess: () => {
      toast.success('Entrada registrada correctamente')
      queryClient.invalidateQueries({ queryKey: ['recent-entries'] })
      queryClient.invalidateQueries({ queryKey: ['products-inventory'] })
      form.reset({ idProducto: 0, idUbicacion: 0, cantidad: 1, costoUnitario: 0, referencia: '', observacion: '' })
    },
    onError: (err: any) => toast.error(err.error ?? 'Error al registrar entrada'),
  })

  // Batch state
  const [batchRows, setBatchRows] = useState<BatchRow[]>([
    { idProducto: 0, idUbicacion: 0, cantidad: 1 },
  ])

  const batchTotal = useMemo(
    () => batchRows.reduce((s, r) => s + (r.cantidad || 0), 0),
    [batchRows]
  )

  function addBatchRow() {
    setBatchRows((prev) => [...prev, { idProducto: 0, idUbicacion: 0, cantidad: 1 }])
  }

  function removeBatchRow(index: number) {
    setBatchRows((prev) => prev.filter((_, i) => i !== index))
  }

  function updateBatchRow(index: number, field: keyof BatchRow, value: number) {
    setBatchRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    )
  }

  const batchMutation = useMutation({
    mutationFn: () => {
      if (!entradaTipo) return Promise.reject({ error: 'Tipo ENTRADA no encontrado' })
      const validRows = batchRows.filter((r) => r.idProducto > 0 && r.idUbicacion > 0 && r.cantidad > 0)
      if (validRows.length === 0) return Promise.reject({ error: 'No hay filas válidas' })
      const batch = validRows.map((r) => ({
        idProducto: r.idProducto,
        idUbicacion: r.idUbicacion,
        idTipo: entradaTipo.id,
        cantidad: r.cantidad,
        usuario: 'Admin',
        referencia: 'Recepción por Lote',
      }))
      return fetch('/api/wms/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch }),
      }).then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() })
    },
    onSuccess: (data: any[]) => {
      toast.success(`Lote registrado: ${data.length} entradas procesadas`)
      queryClient.invalidateQueries({ queryKey: ['recent-entries'] })
      queryClient.invalidateQueries({ queryKey: ['products-inventory'] })
      setBatchRows([{ idProducto: 0, idUbicacion: 0, cantidad: 1 }])
    },
    onError: (err: any) => toast.error(err.error ?? 'Error al registrar lote'),
  })

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Recibir mercancía y actualizar inventario</p>
      </div>

      <Tabs defaultValue="individual" className="w-full">
        <TabsList>
          <TabsTrigger value="individual">Recepción Individual</TabsTrigger>
          <TabsTrigger value="lote">Recepción por Lote</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="mt-4">
          <Card className="rounded-xl shadow-sm transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="h-4 w-4" /> Nueva Recepción
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit((values: any) => createMutation.mutate(values))} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Producto *</Label>
                    <Select
                      value={form.watch('idProducto') ? String(form.watch('idProducto')) : ''}
                      onValueChange={(v) => form.setValue('idProducto', Number(v))}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.sku} - {p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.idProducto && <p className="text-xs text-destructive">{form.formState.errors.idProducto.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Ubicación *</Label>
                    <Select
                      value={form.watch('idUbicacion') ? String(form.watch('idUbicacion')) : ''}
                      onValueChange={(v) => form.setValue('idUbicacion', Number(v))}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar ubicación" /></SelectTrigger>
                      <SelectContent>
                        {ubicaciones.map((u: any) => (
                          <SelectItem key={u.id} value={String(u.id)}>Pasillo {u.pasillo} - Estante {u.estante} - Nivel {u.nivel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.idUbicacion && <p className="text-xs text-destructive">{form.formState.errors.idUbicacion.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Cantidad *</Label>
                    <Input type="number" min={1} {...form.register('cantidad')} />
                    {form.formState.errors.cantidad && <p className="text-xs text-destructive">{form.formState.errors.cantidad.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Costo Unitario</Label>
                    <Input type="number" step="0.01" {...form.register('costoUnitario')} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Referencia</Label>
                    <Input {...form.register('referencia')} placeholder="Ej: Factura #123" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Observaciones</Label>
                    <Input {...form.register('observacion')} />
                  </div>
                </div>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Registrando...' : 'Registrar Entrada'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lote" className="mt-4">
          <Card className="rounded-xl shadow-sm transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <PackagePlus className="h-4 w-4" /> Recepción por Lote
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addBatchRow}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Línea
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-xs">Producto</TableHead>
                      <TableHead className="text-xs">Ubicación</TableHead>
                      <TableHead className="text-xs text-center">Cantidad</TableHead>
                      <TableHead className="text-xs w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchRows.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/50">
                        <TableCell className="py-2">
                          <Select
                            value={row.idProducto ? String(row.idProducto) : ''}
                            onValueChange={(v) => updateBatchRow(idx, 'idProducto', Number(v))}
                          >
                            <SelectTrigger className="h-8 text-xs w-[200px]">
                              <SelectValue placeholder="Seleccionar producto" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p: any) => (
                                <SelectItem key={p.id} value={String(p.id)}>{p.sku} - {p.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-2">
                          <Select
                            value={row.idUbicacion ? String(row.idUbicacion) : ''}
                            onValueChange={(v) => updateBatchRow(idx, 'idUbicacion', Number(v))}
                          >
                            <SelectTrigger className="h-8 text-xs w-[220px]">
                              <SelectValue placeholder="Seleccionar ubicación" />
                            </SelectTrigger>
                            <SelectContent>
                              {ubicaciones.map((u: any) => (
                                <SelectItem key={u.id} value={String(u.id)}>Pasillo {u.pasillo} - Estante {u.estante} - Nivel {u.nivel}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-2">
                          <Input
                            type="number"
                            min={1}
                            className="h-8 text-xs w-20 text-center"
                            value={row.cantidad}
                            onChange={(e) => updateBatchRow(idx, 'cantidad', parseInt(e.target.value, 10) || 0)}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeBatchRow(idx)}
                            disabled={batchRows.length <= 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <p className="text-sm text-muted-foreground">
                  Total: <span className="font-bold text-foreground">{batchTotal} unidades</span> en {batchRows.length} línea(s)
                </p>
                <Button
                  onClick={() => batchMutation.mutate()}
                  disabled={batchMutation.isPending || batchTotal === 0}
                >
                  {batchMutation.isPending ? 'Registrando...' : 'Registrar Lote'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent entries */}
      <Card className="rounded-xl shadow-sm mt-6">
        <CardHeader className="pb-2"><CardTitle className="text-base">Recepciones Recientes</CardTitle></CardHeader>
        <CardContent>
          <div className="table-container max-h-[calc(100vh-18rem)] overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Fecha</TableHead>
                <TableHead className="text-xs">Producto</TableHead>
                <TableHead className="text-xs text-center">Cantidad</TableHead>
                <TableHead className="text-xs">Ubicación</TableHead>
                <TableHead className="text-xs">Referencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entriesLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ))}
              {!entriesLoading && recentEntries.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin entradas registradas</TableCell></TableRow>
              )}
              {!entriesLoading && recentEntries.map((m: any) => (
                <TableRow key={m.id} className="hover:bg-muted/50">
                  <TableCell className="text-xs py-2">{formatDateTime(m.fecha)}</TableCell>
                  <TableCell className="text-xs py-2 font-medium">{m.producto?.nombre?.substring(0, 30)}</TableCell>
                  <TableCell className="text-xs py-2 text-center font-mono">{m.cantidad}</TableCell>
                  <TableCell className="text-xs py-2">{m.ubicacion ? `${m.ubicacion.pasillo}-${m.ubicacion.estante}-${m.ubicacion.nivel}` : '-'}</TableCell>
                  <TableCell className="text-xs py-2 text-muted-foreground">{m.referencia ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
