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
import { Plus, Search, Pencil, Trash2, Eye } from 'lucide-react'
import { formatCurrency, formatDate } from './lib/format'

const clienteSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  tipoCliente: z.string(),
})

type ClienteFormData = z.infer<typeof clienteSchema>

export function ClientsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [viewId, setViewId] = useState<number | null>(null)

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', search],
    queryFn: () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      return fetch(`/api/wms/clientes${params}`).then((r) => r.json())
    },
  })

  const { data: viewCliente } = useQuery({
    queryKey: ['cliente-detail', viewId],
    queryFn: () => fetch(`/api/wms/clientes/${viewId}`).then((r) => r.json()),
    enabled: !!viewId,
  })

  const form = useForm<ClienteFormData>({ resolver: zodResolver(clienteSchema) as any, defaultValues: { nombre: '', telefono: '', email: '', tipoCliente: 'Tecnico' } })

  const createMutation = useMutation({
    mutationFn: (values: ClienteFormData) =>
      fetch('/api/wms/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
        .then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() }),
    onSuccess: () => { toast.success('Cliente creado'); queryClient.invalidateQueries({ queryKey: ['clientes'] }); setShowCreate(false); form.reset() },
    onError: (err: any) => toast.error(err.error ?? 'Error al crear cliente'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: ClienteFormData }) =>
      fetch(`/api/wms/clientes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
        .then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() }),
    onSuccess: () => { toast.success('Cliente actualizado'); queryClient.invalidateQueries({ queryKey: ['clientes'] }); setEditId(null); form.reset() },
    onError: (err: any) => toast.error(err.error ?? 'Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/wms/clientes/${id}`, { method: 'DELETE' }).then((r) => { if (!r.ok) return r.json().then((e) => Promise.reject(e)); return r.json() }),
    onSuccess: () => { toast.success('Cliente eliminado'); queryClient.invalidateQueries({ queryKey: ['clientes'] }); setDeleteId(null) },
    onError: (err: any) => toast.error(err.error ?? 'Error al eliminar'),
  })

  function openEdit(c: any) {
    setEditId(c.id)
    form.reset({ nombre: c.nombre, telefono: c.telefono ?? '', email: c.email ?? '', tipoCliente: c.tipoCliente ?? 'Tecnico' })
  }

  function handleSearch() { setSearch(searchInput) }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o teléfono..." className="pl-9" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          </div>
          <Button variant="outline" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
        </div>
        <Button onClick={() => { form.reset(); setShowCreate(true) }}><Plus className="h-4 w-4 mr-1" /> Nuevo Cliente</Button>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Base de datos de técnicos y clientes</p>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nombre</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Teléfono</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Email</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Tipo</TableHead>
                  <TableHead className="text-xs text-center">Compras</TableHead>
                  <TableHead className="text-xs text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && clientes.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No se encontraron clientes</TableCell></TableRow>
                )}
                {!isLoading && clientes.map((c: any) => (
                  <TableRow key={c.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-medium py-2">{c.nombre}</TableCell>
                    <TableCell className="text-xs py-2 hidden md:table-cell">{c.telefono ?? '-'}</TableCell>
                    <TableCell className="text-xs py-2 hidden lg:table-cell">{c.email ?? '-'}</TableCell>
                    <TableCell className="text-xs py-2 hidden sm:table-cell">{c.tipoCliente}</TableCell>
                    <TableCell className="text-xs text-center py-2">
                      <span className="font-mono">{c.ventas?.length ?? 0}</span>
                    </TableCell>
                    <TableCell className="text-xs text-right py-2">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewId(c.id)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate || !!editId} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditId(null); form.reset() } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle><DialogDescription className="sr-only">{editId ? 'Formulario para editar los datos del cliente' : 'Formulario para crear un nuevo cliente'}</DialogDescription></DialogHeader>
          <form onSubmit={form.handleSubmit((values: any) => { editId ? updateMutation.mutate({ id: editId, values }) : createMutation.mutate(values) })} className="space-y-4">
            <div className="space-y-2"><Label>Nombre *</Label><Input {...form.register('nombre')} />{form.formState.errors.nombre && <p className="text-xs text-destructive">{form.formState.errors.nombre.message}</p>}</div>
            <div className="space-y-2"><Label>Teléfono</Label><Input {...form.register('telefono')} /></div>
            <div className="space-y-2"><Label>Email</Label><Input {...form.register('email')} type="email" />{form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}</div>
            <div className="space-y-2">
              <Label>Tipo de Cliente</Label>
              <Select value={form.watch('tipoCliente')} onValueChange={(v) => form.setValue('tipoCliente', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tecnico">Técnico</SelectItem>
                  <SelectItem value="Empresa">Empresa</SelectItem>
                  <SelectItem value="Particular">Particular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setEditId(null) }}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View detail dialog */}
      <Dialog open={!!viewId} onOpenChange={(open) => { if (!open) setViewId(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Historial del Cliente</DialogTitle><DialogDescription className="sr-only">Historial de compras del cliente seleccionado</DialogDescription></DialogHeader>
          {viewCliente && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Nombre:</span> <span className="font-medium">{viewCliente.nombre}</span></div>
                <div><span className="text-muted-foreground">Teléfono:</span> {viewCliente.telefono ?? '-'}</div>
                <div><span className="text-muted-foreground">Email:</span> {viewCliente.email ?? '-'}</div>
                <div><span className="text-muted-foreground">Tipo:</span> {viewCliente.tipoCliente}</div>
              </div>
              <p className="text-sm font-medium">Compras ({viewCliente.ventas?.length ?? 0})</p>
              {viewCliente.ventas && viewCliente.ventas.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead className="text-xs">Folio</TableHead><TableHead className="text-xs">Fecha</TableHead><TableHead className="text-xs text-right">Total</TableHead><TableHead className="text-xs text-center">Estado</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {viewCliente.ventas.map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-xs font-mono py-1.5">{v.folio}</TableCell>
                        <TableCell className="text-xs py-1.5">{formatDate(v.fecha)}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{formatCurrency(v.total ?? 0)}</TableCell>
                        <TableCell className="text-xs text-center py-1.5"><span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{v.estado}</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Sin compras registradas</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
