'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus } from 'lucide-react'

const locationSchema = z.object({
  pasillo: z.string().min(1, 'Pasillo requerido'),
  estante: z.string().min(1, 'Estante requerido'),
  nivel: z.string().min(1, 'Nivel requerido'),
})

type LocationFormData = z.infer<typeof locationSchema>

interface Ubicacion {
  id: number
  pasillo: string
  estante: string
  nivel: string
  activo: boolean
}

interface StockEntry {
  idProducto: number
  idUbicacion: number
  cantidad: number
  producto: { id: number; sku: string; nombre: string; costoUnitario: number }
  ubicacion: Ubicacion
}

export function LocationsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Ubicacion | null>(null)

  const { data: ubicaciones = [], isLoading } = useQuery<Ubicacion[]>({
    queryKey: ['ubicaciones'],
    queryFn: () => fetch('/api/wms/ubicaciones?activos=true').then((r) => r.json()),
  })

  const { data: stockEntries = [] } = useQuery<StockEntry[]>({
    queryKey: ['all-stock'],
    queryFn: () => fetch('/api/wms/stock').then((r) => r.json()),
  })

  const { data: locationStock = [] } = useQuery<StockEntry[]>({
    queryKey: ['location-stock', selectedLocation?.id],
    queryFn: () => fetch(`/api/wms/stock?idProducto=`).then((r) => r.json()).then((items: StockEntry[]) =>
      items.filter((s) => s.idUbicacion === selectedLocation!.id)
    ),
    enabled: !!selectedLocation,
  })

  const form = useForm<LocationFormData>({ resolver: zodResolver(locationSchema), defaultValues: { pasillo: '', estante: '', nivel: '' } })

  const createMutation = useMutation({
    mutationFn: (values: LocationFormData) =>
      fetch('/api/wms/ubicaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
        .then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() }),
    onSuccess: () => { toast.success('Ubicación creada'); queryClient.invalidateQueries({ queryKey: ['ubicaciones'] }); setShowCreate(false); form.reset() },
    onError: (err: any) => toast.error(err.error ?? 'Error al crear ubicación'),
  })

  // Build a map of location id -> total stock
  const stockMap = new Map<number, number>()
  stockEntries.forEach((s) => {
    stockMap.set(s.idUbicacion, (stockMap.get(s.idUbicacion) ?? 0) + s.cantidad)
  })

  // Group by pasillo
  const pasillos = [...new Set(ubicaciones.map((u) => u.pasillo))].sort()
  const estantes = (pasillo: string) => [...new Set(ubicaciones.filter((u) => u.pasillo === pasillo).map((u) => u.estante))].sort()
  const niveles = (pasillo: string, estante: string) => ubicaciones.filter((u) => u.pasillo === pasillo && u.estante === estante).sort((a, b) => a.nivel.localeCompare(b.nivel))

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{ubicaciones.length} ubicaciones registradas</p>
        <Button onClick={() => { form.reset(); setShowCreate(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Nueva Ubicación
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {pasillos.map((pasillo) => (
            <Card key={pasillo} className="rounded-xl shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Pasillo {pasillo}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {estantes(pasillo).map((estante) => (
                    niveles(pasillo, estante).map((loc) => {
                      const qty = stockMap.get(loc.id) ?? 0
                      const hasStock = qty > 0
                      return (
                        <button
                          key={loc.id}
                          onClick={() => setSelectedLocation(loc)}
                          className={`rounded-lg border p-3 text-center transition-colors hover:ring-2 hover:ring-primary ${hasStock ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' : 'bg-muted border-muted-foreground/10'}`}
                        >
                          <p className="text-xs font-semibold">{loc.estante}-{loc.nivel}</p>
                          <p className={`text-lg font-bold ${hasStock ? 'text-green-700 dark:text-green-300' : 'text-muted-foreground'}`}>{qty}</p>
                        </button>
                      )
                    })
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {pasillos.length === 0 && (
            <Card className="rounded-xl shadow-sm"><CardContent className="py-8 text-center text-muted-foreground">No hay ubicaciones registradas</CardContent></Card>
          )}
        </div>
      )}

      {/* Location detail dialog */}
      <Dialog open={!!selectedLocation} onOpenChange={(open) => { if (!open) setSelectedLocation(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Stock en Ubicación</DialogTitle>
          </DialogHeader>
          {selectedLocation && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pasillo {selectedLocation.pasillo} · Estante {selectedLocation.estante} · Nivel {selectedLocation.nivel}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">SKU</TableHead>
                    <TableHead className="text-xs">Producto</TableHead>
                    <TableHead className="text-xs text-right">Cantidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationStock.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sin stock en esta ubicación</TableCell></TableRow>
                  )}
                  {locationStock.map((s) => (
                    <TableRow key={s.idProducto}>
                      <TableCell className="text-xs font-mono py-2">{s.producto.sku}</TableCell>
                      <TableCell className="text-xs py-2">{s.producto.nombre}</TableCell>
                      <TableCell className="text-xs text-right font-mono py-2">{s.cantidad}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) setShowCreate(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva Ubicación</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
            <div className="space-y-2"><Label>Pasillo *</Label><Input {...form.register('pasillo')} placeholder="Ej: A" />{form.formState.errors.pasillo && <p className="text-xs text-destructive">{form.formState.errors.pasillo.message}</p>}</div>
            <div className="space-y-2"><Label>Estante *</Label><Input {...form.register('estante')} placeholder="Ej: 1" />{form.formState.errors.estante && <p className="text-xs text-destructive">{form.formState.errors.estante.message}</p>}</div>
            <div className="space-y-2"><Label>Nivel *</Label><Input {...form.register('nivel')} placeholder="Ej: 1" />{form.formState.errors.nivel && <p className="text-xs text-destructive">{form.formState.errors.nivel.message}</p>}</div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creando...' : 'Crear'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
