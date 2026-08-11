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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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

// Get max stock in a pasillo for bar width calculation
function getMaxStockInPasillo(locations: Ubicacion[], stockMap: Map<number, number>, pasillo: string): number {
  const stocks = locations
    .filter((u) => u.pasillo === pasillo)
    .map((u) => stockMap.get(u.id) ?? 0)
  return Math.max(...stocks, 1)
}

export function LocationsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
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
    queryFn: () => fetch(`/api/wms/stock?idUbicacion=${selectedLocation!.id}`).then((r) => r.json()),
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

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: LocationFormData }) =>
      fetch('/api/wms/ubicaciones', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...values }) })
        .then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() }),
    onSuccess: () => { toast.success('Ubicación actualizada'); queryClient.invalidateQueries({ queryKey: ['ubicaciones'] }); setEditId(null); form.reset() },
    onError: (err: any) => toast.error(err.error ?? 'Error al actualizar ubicación'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/wms/ubicaciones?id=${id}`, { method: 'DELETE' })
        .then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() }),
    onSuccess: () => { toast.success('Ubicación eliminada'); queryClient.invalidateQueries({ queryKey: ['ubicaciones'] }); setDeleteId(null) },
    onError: (err: any) => toast.error(err.error ?? 'Error al eliminar ubicación'),
  })

  function openEdit(loc: Ubicacion) {
    setEditId(loc.id)
    form.reset({ pasillo: loc.pasillo, estante: loc.estante, nivel: loc.nivel })
  }

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">{ubicaciones.length} ubicaciones registradas</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Con stock
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20 border border-muted-foreground/30" /> Sin stock
            </span>
          </div>
        </div>
        <Button onClick={() => { form.reset(); setShowCreate(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Nueva Ubicación
        </Button>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Mapa visual del almacén con stock por ubicación</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {pasillos.map((pasillo) => {
            const maxStock = getMaxStockInPasillo(ubicaciones, stockMap, pasillo)
            return (
              <Card key={pasillo} className="card-hover rounded-xl shadow-sm border transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="h-6 w-6 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{pasillo}</span>
                    Pasillo {pasillo}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {estantes(pasillo).map((estante) => (
                      niveles(pasillo, estante).map((loc) => {
                        const qty = stockMap.get(loc.id) ?? 0
                        const hasStock = qty > 0
                        const barWidth = maxStock > 0 ? (qty / maxStock) * 100 : 0
                        return (
                          <div key={loc.id} className="relative group">
                            <button
                              onClick={() => setSelectedLocation(loc)}
                              className={cn(
                                'w-full rounded-lg border p-3 text-left transition-all duration-200 hover:ring-2 hover:ring-primary/50 hover:scale-[1.02]',
                                hasStock
                                  ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800'
                                  : 'bg-muted/50 border-border'
                              )}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[11px] font-semibold text-foreground">{loc.pasillo}-{loc.estante}-{loc.nivel}</p>
                                <span className={cn(
                                  'text-[11px] font-bold font-mono',
                                  hasStock ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'
                                )}>
                                  {qty}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-foreground/5 overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all duration-300',
                                    hasStock ? 'bg-emerald-500' : 'bg-muted-foreground/15'
                                  )}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </button>
                            {/* Edit & Delete buttons on hover */}
                            <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                className="h-5 w-5 rounded bg-background border shadow-sm flex items-center justify-center hover:bg-accent"
                                onClick={(e) => { e.stopPropagation(); openEdit(loc) }}
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                              <button
                                className="h-5 w-5 rounded bg-background border shadow-sm flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
                                onClick={(e) => { e.stopPropagation(); setDeleteId(loc.id) }}
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {pasillos.length === 0 && (
            <Card className="rounded-xl shadow-sm"><CardContent className="py-8 text-center text-muted-foreground">No hay ubicaciones registradas</CardContent></Card>
          )}
        </div>
      )}

      {/* Location detail dialog */}
      <Dialog open={!!selectedLocation} onOpenChange={(open) => { if (!open) setSelectedLocation(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="dialog-header-accent">
            <DialogTitle>Stock en Ubicación</DialogTitle>
            <DialogDescription className="sr-only">Productos almacenados en la ubicación seleccionada</DialogDescription>
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
                    <TableRow key={s.idProducto} className="hover:bg-muted/50">
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
          <DialogHeader className="dialog-header-accent"><DialogTitle>Nueva Ubicación</DialogTitle><DialogDescription className="sr-only">Formulario para crear una nueva ubicación de almacenamiento</DialogDescription></DialogHeader>
          <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
            <div className="space-y-2"><Label className="text-sm font-medium">Pasillo *</Label><Input {...form.register('pasillo')} placeholder="Ej: A" />{form.formState.errors.pasillo && <p className="text-xs text-destructive">{form.formState.errors.pasillo.message}</p>}</div>
            <div className="space-y-2"><Label className="text-sm font-medium">Estante *</Label><Input {...form.register('estante')} placeholder="Ej: 1" />{form.formState.errors.estante && <p className="text-xs text-destructive">{form.formState.errors.estante.message}</p>}</div>
            <div className="space-y-2"><Label className="text-sm font-medium">Nivel *</Label><Input {...form.register('nivel')} placeholder="Ej: 1" />{form.formState.errors.nivel && <p className="text-xs text-destructive">{form.formState.errors.nivel.message}</p>}</div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creando...' : 'Crear'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editId} onOpenChange={(open) => { if (!open) { setEditId(null); form.reset() } }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="dialog-header-accent"><DialogTitle>Editar Ubicación</DialogTitle><DialogDescription className="sr-only">Formulario para editar una ubicación de almacenamiento</DialogDescription></DialogHeader>
          <form onSubmit={form.handleSubmit((values) => editId && updateMutation.mutate({ id: editId, values }))} className="space-y-4">
            <div className="space-y-2"><Label className="text-sm font-medium">Pasillo *</Label><Input {...form.register('pasillo')} placeholder="Ej: A" />{form.formState.errors.pasillo && <p className="text-xs text-destructive">{form.formState.errors.pasillo.message}</p>}</div>
            <div className="space-y-2"><Label className="text-sm font-medium">Estante *</Label><Input {...form.register('estante')} placeholder="Ej: 1" />{form.formState.errors.estante && <p className="text-xs text-destructive">{form.formState.errors.estante.message}</p>}</div>
            <div className="space-y-2"><Label className="text-sm font-medium">Nivel *</Label><Input {...form.register('nivel')} placeholder="Ej: 1" />{form.formState.errors.nivel && <p className="text-xs text-destructive">{form.formState.errors.nivel.message}</p>}</div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setEditId(null); form.reset() }}>Cancelar</Button>
              <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Actualizando...' : 'Actualizar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ubicación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará la ubicación. Si tiene stock asociado, no se podrá eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
