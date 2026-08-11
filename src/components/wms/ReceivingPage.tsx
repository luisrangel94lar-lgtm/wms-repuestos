'use client'

import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Download } from 'lucide-react'
import { formatDate, formatCurrency, tipoMovColors } from './lib/format'

const receivingSchema = z.object({
  idProducto: z.coerce.number().min(1, 'Producto requerido'),
  idUbicacion: z.coerce.number().min(1, 'Ubicación requerida'),
  cantidad: z.coerce.number().min(1, 'Cantidad mínima 1'),
  costoUnitario: z.coerce.number().min(0),
  referencia: z.string().optional(),
  observacion: z.string().optional(),
})

type ReceivingFormData = z.infer<typeof receivingSchema>

export function ReceivingPage() {
  const queryClient = useQueryClient()

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
    queryFn: () =>
      fetch('/api/wms/movimientos').then((r) => r.json()).then((items: any[]) =>
        items.filter((m) => m.tipoMovimiento?.nombre === 'ENTRADA').slice(0, 20)
      ),
  })

  const form = useForm<ReceivingFormData>({
    resolver: zodResolver(receivingSchema) as any,
    defaultValues: { idProducto: 0, idUbicacion: 0, cantidad: 1, costoUnitario: 0, referencia: '', observacion: '' },
  })

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

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" /> Nueva Recepción
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((values: any) => createMutation.mutate(values))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Producto *</Label>
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
                <Label>Ubicación *</Label>
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
                <Label>Cantidad *</Label>
                <Input type="number" min={1} {...form.register('cantidad')} />
                {form.formState.errors.cantidad && <p className="text-xs text-destructive">{form.formState.errors.cantidad.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Costo Unitario</Label>
                <Input type="number" step="0.01" {...form.register('costoUnitario')} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Referencia</Label>
                <Input {...form.register('referencia')} placeholder="Ej: Factura #123" />
              </div>
              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Input {...form.register('observacion')} />
              </div>
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Registrando...' : 'Registrar Entrada'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent entries */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base">Entradas Recientes</CardTitle></CardHeader>
        <CardContent>
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
                  <TableCell className="text-xs py-2">{formatDate(m.fecha)}</TableCell>
                  <TableCell className="text-xs py-2 font-medium">{m.producto?.nombre?.substring(0, 30)}</TableCell>
                  <TableCell className="text-xs text-center font-mono py-2">+{m.cantidad}</TableCell>
                  <TableCell className="text-xs py-2">{m.ubicacion ? `${m.ubicacion.pasillo}-${m.ubicacion.estante}-${m.ubicacion.nivel}` : '-'}</TableCell>
                  <TableCell className="text-xs py-2 text-muted-foreground">{m.referencia ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
