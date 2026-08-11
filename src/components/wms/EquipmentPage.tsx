'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, ChevronDown, ChevronRight, Pencil, Trash2, Link as LinkIcon } from 'lucide-react'

const equipoSchema = z.object({
  idMarca: z.coerce.number().min(1, 'Marca requerida'),
  modelo: z.string().min(1, 'Modelo requerido'),
  tipoEquipo: z.string().optional(),
})

type EquipoFormData = z.infer<typeof equipoSchema>

interface Equipo {
  id: number
  idMarca: number
  modelo: string
  tipoEquipo: string | null
  marca: { id: number; nombre: string }
}

export function EquipmentPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [linkDialog, setLinkDialog] = useState<{ equipoId: number; mode: 'link' | 'unlink' } | null>(null)
  const [linkProductId, setLinkProductId] = useState('')

  const { data: equipos = [], isLoading } = useQuery<Equipo[]>({
    queryKey: ['equipos', search],
    queryFn: () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      return fetch(`/api/wms/equipos${params}`).then((r) => r.json())
    },
  })

  const { data: expandedEquipo } = useQuery({
    queryKey: ['equipo-detail', expandedId],
    queryFn: () => fetch(`/api/wms/equipos/${expandedId}`).then((r) => r.json()),
    enabled: !!expandedId,
  })

  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products-link'],
    queryFn: () => fetch('/api/wms/productos?pageSize=100').then((r) => r.json()).then((d: any) => d.items ?? []),
    enabled: !!linkDialog,
  })

  const { data: marcas = [] } = useQuery({
    queryKey: ['marcas-list'],
    queryFn: async () => {
      const res = await fetch('/api/wms/productos?pageSize=1')
      const data = await res.json()
      return []
    },
  })

  const form = useForm<EquipoFormData>({ resolver: zodResolver(equipoSchema) as any, defaultValues: { idMarca: 0, modelo: '', tipoEquipo: '' } })

  const createMutation = useMutation({
    mutationFn: (values: EquipoFormData) =>
      fetch('/api/wms/equipos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
        .then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() }),
    onSuccess: () => { toast.success('Equipo creado'); queryClient.invalidateQueries({ queryKey: ['equipos'] }); setShowCreate(false); form.reset() },
    onError: (err: any) => toast.error(err.error ?? 'Error al crear equipo'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: EquipoFormData }) =>
      fetch(`/api/wms/equipos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
        .then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() }),
    onSuccess: () => { toast.success('Equipo actualizado'); queryClient.invalidateQueries({ queryKey: ['equipos'] }); setEditId(null); form.reset() },
    onError: (err: any) => toast.error(err.error ?? 'Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/wms/equipos/${id}`, { method: 'DELETE' }).then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() }),
    onSuccess: () => { toast.success('Equipo eliminado'); queryClient.invalidateQueries({ queryKey: ['equipos'] }); setDeleteId(null) },
    onError: (err: any) => toast.error(err.error ?? 'Error al eliminar'),
  })

  const linkMutation = useMutation({
    mutationFn: ({ idProducto, idEquipo }: { idProducto: number; idEquipo: number }) =>
      fetch('/api/wms/producto-equipo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idProducto, idEquipo }) })
        .then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() }),
    onSuccess: () => { toast.success('Compatibilidad agregada'); queryClient.invalidateQueries({ queryKey: ['equipo-detail'] }); setLinkDialog(null); setLinkProductId('') },
    onError: (err: any) => toast.error(err.error ?? 'Error al vincular'),
  })

  const unlinkMutation = useMutation({
    mutationFn: ({ idProducto, idEquipo }: { idProducto: number; idEquipo: number }) =>
      fetch('/api/wms/producto-equipo', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idProducto, idEquipo }) })
        .then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() }),
    onSuccess: () => { toast.success('Compatibilidad eliminada'); queryClient.invalidateQueries({ queryKey: ['equipo-detail'] }); setLinkDialog(null); setLinkProductId('') },
    onError: (err: any) => toast.error(err.error ?? 'Error al desvincular'),
  })

  function openEdit(eq: Equipo) {
    setEditId(eq.id)
    form.reset({ idMarca: eq.idMarca, modelo: eq.modelo, tipoEquipo: eq.tipoEquipo ?? '' })
  }

  function handleSearch() { setSearch(searchInput) }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar modelo o marca..." className="pl-9" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          </div>
          <Button variant="outline" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
        </div>
        <Button onClick={() => { form.reset({ idMarca: 0, modelo: '', tipoEquipo: '' }); setShowCreate(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo Equipo
        </Button>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="text-xs">Modelo</TableHead>
                <TableHead className="text-xs">Marca</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Tipo</TableHead>
                <TableHead className="text-xs text-center">Repuestos</TableHead>
                <TableHead className="text-xs text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ))}
              {!isLoading && equipos.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No se encontraron equipos</TableCell></TableRow>
              )}
              {!isLoading && equipos.map((eq) => {
                const isExpanded = expandedId === eq.id
                return (
                  <>
                    <TableRow key={eq.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : eq.id)}>
                      <TableCell className="py-2 w-8">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                      <TableCell className="text-xs font-medium py-2">{eq.modelo}</TableCell>
                      <TableCell className="text-xs py-2">{eq.marca?.nombre}</TableCell>
                      <TableCell className="text-xs py-2 hidden md:table-cell">{eq.tipoEquipo ?? '-'}</TableCell>
                      <TableCell className="text-xs text-center py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {expandedEquipo?.productoEquipo?.length ?? '?'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setLinkDialog({ equipoId: eq.id, mode: 'link' })}><LinkIcon className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(eq)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(eq.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && expandedEquipo && (
                      <TableRow key={`${eq.id}-detail`}>
                        <TableCell colSpan={6} className="bg-muted/30 px-8 py-3">
                          <p className="text-xs font-semibold mb-2">Repuestos compatibles:</p>
                          {expandedEquipo.productoEquipo && expandedEquipo.productoEquipo.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {expandedEquipo.productoEquipo.map((pe: any) => (
                                <div key={pe.idProducto} className="flex items-center gap-1">
                                  <Badge variant="secondary" className="text-[10px]">{pe.producto?.sku} - {pe.producto?.nombre}</Badge>
                                  <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => setLinkDialog({ equipoId: eq.id, mode: 'unlink' })}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Sin repuestos vinculados</p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate || !!editId} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditId(null); form.reset() } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Editar Equipo' : 'Nuevo Equipo'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((values: any) => { editId ? updateMutation.mutate({ id: editId, values }) : createMutation.mutate(values) })} className="space-y-4">
            <div className="space-y-2">
              <Label>Marca *</Label>
              <Input {...form.register('idMarca', { valueAsNumber: true })} type="number" placeholder="ID de marca" />
              {form.formState.errors.idMarca && <p className="text-xs text-destructive">{form.formState.errors.idMarca.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Modelo *</Label>
              <Input {...form.register('modelo')} />
              {form.formState.errors.modelo && <p className="text-xs text-destructive">{form.formState.errors.modelo.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Tipo de Equipo</Label>
              <Input {...form.register('tipoEquipo')} placeholder="Ej: Aire acondicionado split" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setEditId(null) }}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link Product Dialog */}
      <Dialog open={!!linkDialog} onOpenChange={(open) => { if (!open) setLinkDialog(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{linkDialog?.mode === 'link' ? 'Vincular Repuesto' : 'Desvincular Repuesto'}</DialogTitle></DialogHeader>
          {linkDialog?.mode === 'link' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>ID del Producto</Label>
                <Input type="number" value={linkProductId} onChange={(e) => setLinkProductId(e.target.value)} placeholder="ID del producto a vincular" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLinkDialog(null)}>Cancelar</Button>
                <Button onClick={() => linkProductId && linkMutation.mutate({ idProducto: Number(linkProductId), idEquipo: linkDialog.equipoId })} disabled={linkMutation.isPending || !linkProductId}>
                  {linkMutation.isPending ? 'Vinculando...' : 'Vincular'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>ID del Producto a desvincular</Label>
                <Input type="number" value={linkProductId} onChange={(e) => setLinkProductId(e.target.value)} placeholder="ID del producto" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLinkDialog(null)}>Cancelar</Button>
                <Button variant="destructive" onClick={() => linkProductId && unlinkMutation.mutate({ idProducto: Number(linkProductId), idEquipo: linkDialog!.equipoId })} disabled={unlinkMutation.isPending || !linkProductId}>
                  {unlinkMutation.isPending ? 'Desvinculando...' : 'Desvincular'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
