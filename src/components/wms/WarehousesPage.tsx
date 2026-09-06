'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Warehouse, Plus, Edit, Trash2, Users, MapPin, Building2 } from 'lucide-react'
import { useWmsStore } from '@/store/wms'
import type { Almacen, Empresa } from '@/types/wms'

interface AlmacenFormData {
  nombre: string
  direccion: string
  telefono: string
  encargado: string
  empresaId: string
}

const defaultForm: AlmacenFormData = { nombre: '', direccion: '', telefono: '', encargado: '', empresaId: '' }

export function WarehousesPage() {
  const queryClient = useQueryClient()
  const { session, selectedEmpresaId, setSelectedEmpresaId } = useWmsStore()
  const userRol = session?.user?.rol
  const isSuperAdmin = userRol === 'super_admin'
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deactivateId, setDeactivateId] = useState<number | null>(null)
  const [form, setForm] = useState<AlmacenFormData>(defaultForm)

  // Fetch empresas for filter and dropdown
  const { data: empresas = [] } = useQuery<Empresa[]>({
    queryKey: ['empresas-list'],
    queryFn: async () => {
      const response = await fetch('/api/wms/empresas')
      if (!response.ok) throw new Error('No se pudieron cargar las empresas')
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
    enabled: isSuperAdmin,
  })

  // Filter by empresa if super_admin
  const filterEmpresaId: string = isSuperAdmin ? String(selectedEmpresaId ?? '') : ''

  const { data: almacenes = [], isLoading } = useQuery<Almacen[]>({
    queryKey: ['almacenes', filterEmpresaId],
    queryFn: () => {
      const params = filterEmpresaId ? `?empresaId=${filterEmpresaId}` : ''
      return fetch(`/api/wms/almacenes${params}`).then(async (response) => {
        if (!response.ok) throw new Error('No se pudieron cargar los almacenes')
        const data = await response.json()
        return Array.isArray(data) ? data : []
      })
    },
  })

  const createMutation = useMutation({
    mutationFn: (values: AlmacenFormData) =>
      fetch('/api/wms/almacenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, empresaId: Number(values.empresaId) }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      toast.success('Almacén creado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['almacenes'] })
      setShowCreate(false)
      setForm(defaultForm)
    },
    onError: (err: any) => toast.error(err.error ?? 'Error al crear almacén'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: AlmacenFormData }) =>
      fetch(`/api/wms/almacenes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, empresaId: Number(values.empresaId) }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      toast.success('Almacén actualizado')
      queryClient.invalidateQueries({ queryKey: ['almacenes'] })
      setEditId(null)
      setForm(defaultForm)
    },
    onError: (err: any) => toast.error(err.error ?? 'Error al actualizar almacén'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/wms/almacenes/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      toast.success('Almacén desactivado')
      queryClient.invalidateQueries({ queryKey: ['almacenes'] })
      setDeactivateId(null)
    },
    onError: (err: any) => toast.error(err.error ?? 'Error al desactivar almacén'),
  })

  function openEdit(almacen: Almacen) {
    setForm({
      nombre: almacen.nombre,
      direccion: almacen.direccion ?? '',
      telefono: almacen.telefono ?? '',
      encargado: almacen.encargado ?? '',
      empresaId: almacen.empresaId.toString(),
    })
    setEditId(almacen.id)
  }

  const isMutating = createMutation.isPending || updateMutation.isPending || deactivateMutation.isPending
  const totalUbicaciones = almacenes.reduce((a, al) => a + (al._count?.ubicaciones ?? 0), 0)
  const activeAlmacenes = almacenes.filter((a) => a.activo).length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Almacenes</h2>
          <p className="text-sm text-muted-foreground">Administra los almacenes de la empresa</p>
        </div>
        <Button onClick={() => { setForm({ ...defaultForm, empresaId: (selectedEmpresaId ?? '').toString() }); setShowCreate(true) }} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Almacén
        </Button>
      </div>

      {/* Empresa filter for super_admin */}
      {isSuperAdmin && (
        <div className="flex items-center gap-3">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filtrar por empresa:</span>
          <Select value={filterEmpresaId} onValueChange={(v) => setSelectedEmpresaId(v ? Number(v) : null)}>
            <SelectTrigger className="w-64 h-9">
              <SelectValue placeholder="Todas las empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las empresas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id.toString()}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Warehouse className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Almacenes</p>
                <p className="text-2xl font-bold tabular-nums">{almacenes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                <Warehouse className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Activos</p>
                <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{activeAlmacenes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Ubicaciones</p>
                <p className="text-2xl font-bold tabular-nums">{totalUbicaciones}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : almacenes.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Warehouse className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay almacenes registrados</p>
              <p className="text-xs mt-1">Crea un nuevo almacén para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold">Nombre</TableHead>
                    {isSuperAdmin && <TableHead className="text-xs font-semibold">Empresa</TableHead>}
                    <TableHead className="text-xs font-semibold">Dirección</TableHead>
                    <TableHead className="text-xs font-semibold">Encargado</TableHead>
                    <TableHead className="text-xs font-semibold">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Usuarios</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {almacenes.map((almacen) => (
                    <TableRow key={almacen.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                            <Warehouse className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[200px]">{almacen.nombre}</p>
                            {almacen.telefono && <p className="text-[11px] text-muted-foreground">{almacen.telefono}</p>}
                          </div>
                        </div>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-sm text-muted-foreground">{almacen.empresa?.nombre ?? '—'}</TableCell>
                      )}
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">{almacen.direccion ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{almacen.encargado ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={almacen.activo ? 'default' : 'destructive'}
                          className={almacen.activo
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                            : ''}>
                          {almacen.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-medium tabular-nums">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {almacen._count?.usuarios ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(almacen)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          {almacen.activo && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setDeactivateId(almacen.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) setShowCreate(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Almacén</DialogTitle>
            <DialogDescription>Registra un nuevo almacén en el sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-nombre">Nombre *</Label>
              <Input id="create-nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del almacén" />
            </div>
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>Empresa *</Label>
                <Select value={form.empresaId} onValueChange={(v) => setForm({ ...form, empresaId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.filter((e) => e.activa).map((e) => (
                      <SelectItem key={e.id} value={e.id.toString()}>{e.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-direccion">Dirección</Label>
              <Input id="create-direccion" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Dirección del almacén" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-telefono">Teléfono</Label>
                <Input id="create-telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="Teléfono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-encargado">Encargado</Label>
                <Input id="create-encargado" value={form.encargado} onChange={(e) => setForm({ ...form, encargado: e.target.value })} placeholder="Encargado" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.nombre.trim() || (isSuperAdmin && !form.empresaId) || isMutating}>
              {createMutation.isPending ? 'Creando...' : 'Crear Almacén'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editId !== null} onOpenChange={(open) => { if (!open) { setEditId(null); setForm(defaultForm) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Almacén</DialogTitle>
            <DialogDescription>Modifica los datos del almacén</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-nombre">Nombre *</Label>
              <Input id="edit-nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>Empresa *</Label>
                <Select value={form.empresaId} onValueChange={(v) => setForm({ ...form, empresaId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.filter((e) => e.activa).map((e) => (
                      <SelectItem key={e.id} value={e.id.toString()}>{e.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-direccion">Dirección</Label>
              <Input id="edit-direccion" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-telefono">Teléfono</Label>
                <Input id="edit-telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-encargado">Encargado</Label>
                <Input id="edit-encargado" value={form.encargado} onChange={(e) => setForm({ ...form, encargado: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditId(null); setForm(defaultForm) }}>Cancelar</Button>
            <Button onClick={() => editId && updateMutation.mutate({ id: editId, values: form })} disabled={!form.nombre.trim() || (isSuperAdmin && !form.empresaId) || isMutating}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={deactivateId !== null} onOpenChange={(open) => { if (!open) setDeactivateId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar almacén?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará el almacén. Los usuarios asociados no podrán operar en este almacén.
              Esta acción puede revertirse editando el almacén posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivateId && deactivateMutation.mutate(deactivateId)}
              disabled={deactivateMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deactivateMutation.isPending ? 'Desactivando...' : 'Desactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
