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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Building2, Plus, Edit, Trash2, Users, Warehouse } from 'lucide-react'
import type { Empresa, EmpresaStats } from '@/types/wms'

interface EmpresaFormData {
  nombre: string
  nit: string
  direccion: string
  telefono: string
  email: string
}

const defaultForm: EmpresaFormData = { nombre: '', nit: '', direccion: '', telefono: '', email: '' }

function PlanBadge({ plan }: { plan: string | null | undefined }) {
  const config: Record<string, { label: string; className: string }> = {
    Mensual: { label: 'Mensual', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    Anual: { label: 'Anual', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
    Vitalicio: { label: 'Vitalicio', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  }
  const c = config[plan ?? ''] ?? { label: plan ?? 'N/A', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>
}

export function CompaniesPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deactivateId, setDeactivateId] = useState<number | null>(null)
  const [form, setForm] = useState<EmpresaFormData>(defaultForm)

  const { data: empresas = [], isLoading } = useQuery<Empresa[]>({
    queryKey: ['empresas'],
    queryFn: async () => {
      const response = await fetch('/api/wms/empresas')
      if (!response.ok) throw new Error('No se pudieron cargar las empresas')
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: stats } = useQuery<EmpresaStats>({
    queryKey: ['empresas-stats'],
    queryFn: async () => {
      const response = await fetch('/api/wms/empresas?stats=true')
      if (!response.ok) throw new Error('No se pudieron cargar las estadísticas')
      return response.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: (values: EmpresaFormData) =>
      fetch('/api/wms/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      toast.success('Empresa creada exitosamente')
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      setShowCreate(false)
      setForm(defaultForm)
    },
    onError: (err: any) => toast.error(err.error ?? 'Error al crear empresa'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: EmpresaFormData }) =>
      fetch(`/api/wms/empresas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      toast.success('Empresa actualizada')
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      setEditId(null)
      setForm(defaultForm)
    },
    onError: (err: any) => toast.error(err.error ?? 'Error al actualizar empresa'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/wms/empresas/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      toast.success('Empresa desactivada')
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      setDeactivateId(null)
    },
    onError: (err: any) => toast.error(err.error ?? 'Error al desactivar empresa'),
  })

  function openEdit(empresa: Empresa) {
    setForm({
      nombre: empresa.nombre,
      nit: empresa.nit ?? '',
      direccion: empresa.direccion ?? '',
      telefono: empresa.telefono ?? '',
      email: empresa.email ?? '',
    })
    setEditId(empresa.id)
  }

  const isMutating = createMutation.isPending || updateMutation.isPending || deactivateMutation.isPending

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Empresas</h2>
          <p className="text-sm text-muted-foreground">Administra las empresas que usan el sistema WMS</p>
        </div>
        <Button onClick={() => { setForm(defaultForm); setShowCreate(true) }} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Empresa
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Empresas</p>
                <p className="text-2xl font-bold tabular-nums">{stats?.totalEmpresas ?? empresas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Activas</p>
                <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {stats?.empresasActivas ?? empresas.filter((e) => e.activa).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Warehouse className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Almacenes</p>
                <p className="text-2xl font-bold tabular-nums">{stats?.totalAlmacenes ?? empresas.reduce((a, e) => a + (e._count?.almacenes ?? 0), 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Usuarios</p>
                <p className="text-2xl font-bold tabular-nums">{stats?.totalUsuarios ?? empresas.reduce((a, e) => a + (e._count?.usuarios ?? 0), 0)}</p>
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
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : empresas.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay empresas registradas</p>
              <p className="text-xs mt-1">Crea la primera empresa para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold">Nombre</TableHead>
                    <TableHead className="text-xs font-semibold">NIT</TableHead>
                    <TableHead className="text-xs font-semibold">Plan</TableHead>
                    <TableHead className="text-xs font-semibold">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Usuarios</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Almacenes</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresas.map((empresa) => (
                    <TableRow key={empresa.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[200px]">{empresa.nombre}</p>
                            {empresa.email && <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{empresa.email}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{empresa.nit ?? '—'}</TableCell>
                      <TableCell><PlanBadge plan={empresa.plan} /></TableCell>
                      <TableCell>
                        <Badge variant={empresa.activa ? 'default' : 'destructive'}
                          className={empresa.activa
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                            : ''}>
                          {empresa.activa ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-medium tabular-nums">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {empresa._count?.usuarios ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-medium tabular-nums">
                          <Warehouse className="h-3 w-3 text-muted-foreground" />
                          {empresa._count?.almacenes ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(empresa)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          {empresa.activa && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setDeactivateId(empresa.id)}>
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
            <DialogTitle>Nueva Empresa</DialogTitle>
            <DialogDescription>Registra una nueva empresa en el sistema WMS</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-nombre">Nombre *</Label>
              <Input id="create-nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre de la empresa" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-nit">NIT</Label>
              <Input id="create-nit" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} placeholder="NIT de la empresa" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-direccion">Dirección</Label>
              <Input id="create-direccion" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Dirección fiscal" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-telefono">Teléfono</Label>
                <Input id="create-telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="Teléfono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email</Label>
                <Input id="create-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.nombre.trim() || isMutating}>
              {createMutation.isPending ? 'Creando...' : 'Crear Empresa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editId !== null} onOpenChange={(open) => { if (!open) { setEditId(null); setForm(defaultForm) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
            <DialogDescription>Modifica los datos de la empresa</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-nombre">Nombre *</Label>
              <Input id="edit-nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nit">NIT</Label>
              <Input id="edit-nit" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} />
            </div>
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
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditId(null); setForm(defaultForm) }}>Cancelar</Button>
            <Button onClick={() => editId && updateMutation.mutate({ id: editId, values: form })} disabled={!form.nombre.trim() || isMutating}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={deactivateId !== null} onOpenChange={(open) => { if (!open) setDeactivateId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará la empresa. Los usuarios y almacenes asociados no podrán acceder al sistema.
              Esta acción puede revertirse editando la empresa posteriormente.
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
