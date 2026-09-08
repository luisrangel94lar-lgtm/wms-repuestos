'use client'

import { useCallback, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWmsStore } from '@/store/wms'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { UserPlus, Pencil, Trash2, Shield, Loader2, Users } from 'lucide-react'

interface UserRow {
  id: number
  nombre: string
  email: string
  rol: string
  activo: boolean
  ultimoAcceso: string | null
  fechaCreacion: string
  empresaId: number | null
  almacenId: number | null
  almacen?: { id: number; nombre: string } | null
}

interface CompanyOption { id: number; nombre: string }
interface WarehouseOption { id: number; nombre: string; empresaId: number }

const ROL_LABELS: Record<string, string> = {
  super_admin: 'Superadministrador',
  admin: 'Dueño de empresa',
  gerente: 'Gerente de almacén',
  cajero: 'Cajero',
  vendedor: 'Vendedor',
  tecnico: 'Técnico',
}

const ROL_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  gerente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cajero: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  vendedor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  tecnico: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

interface UserFormData {
  nombre: string
  email: string
  password: string
  rol: string
  activo: boolean
  empresaId: number | null
  almacenId: number | null
}

const EMPTY_FORM: UserFormData = {
  nombre: '',
  email: '',
  password: '',
  rol: 'cajero',
  activo: true,
  empresaId: null,
  almacenId: null,
}

export function UserManagementPage() {
  const { session, licenseInfo } = useWmsStore()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM)
  const isSuperAdmin = session?.user?.rol === 'super_admin'

  const { data: companies = [] } = useQuery<CompanyOption[]>({
    queryKey: ['empresas', 'user-form'],
    queryFn: async () => {
      const response = await fetch('/api/wms/empresas')
      if (!response.ok) return []
      return response.json()
    },
    enabled: isSuperAdmin,
  })

  const selectedCompanyId = isSuperAdmin ? form.empresaId : session?.user?.empresaId
  const { data: warehouses = [] } = useQuery<WarehouseOption[]>({
    queryKey: ['almacenes', 'user-form', selectedCompanyId],
    queryFn: async () => {
      const params = selectedCompanyId ? `?empresaId=${selectedCompanyId}` : ''
      const response = await fetch(`/api/wms/almacenes${params}`)
      if (!response.ok) return []
      return response.json()
    },
    enabled: Boolean(selectedCompanyId),
  })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/wms/usuarios').then(r => r.json()),
  })

  const saveMutation = useMutation({
    mutationFn: async (data: UserFormData & { id?: number }) => {
      const url = data.id ? `/api/wms/usuarios/${data.id}` : '/api/wms/usuarios'
      const method = data.id ? 'PUT' : 'POST'
      const body: Record<string, unknown> = {
        nombre: data.nombre,
        email: data.email,
        rol: data.rol,
        activo: data.activo,
        empresaId: data.empresaId,
        almacenId: data.almacenId,
      }
      if (!data.id && data.password) body.password = data.password
      if (data.id && data.password) body.password = data.password
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar usuario')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(editingUser ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente')
      closeDialog()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/wms/usuarios/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar usuario')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuario eliminado correctamente')
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: number; activo: boolean }) => {
      const res = await fetch(`/api/wms/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo }),
      })
      if (!res.ok) throw new Error('Error al cambiar estado')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  function openCreateDialog() {
    setEditingUser(null)
    setForm({ ...EMPTY_FORM, empresaId: session?.user?.empresaId ?? null })
    setDialogOpen(true)
  }

  function openEditDialog(user: UserRow) {
    setEditingUser(user)
    setForm({
      nombre: user.nombre,
      email: user.email,
      password: '',
      rol: user.rol,
      activo: user.activo,
      empresaId: user.empresaId,
      almacenId: user.almacenId,
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingUser(null)
    setForm(EMPTY_FORM)
  }

  function handleSave() {
    if (!form.nombre.trim() || !form.email.trim()) {
      toast.error('Nombre y email son obligatorios')
      return
    }
    if (!editingUser && !form.password) {
      toast.error('La contraseña es obligatoria para nuevos usuarios')
      return
    }
    if (!form.almacenId) {
      toast.error('Seleccione el almacén donde trabajará el usuario')
      return
    }
    saveMutation.mutate({ ...form, id: editingUser?.id })
  }

  const maxUsers = licenseInfo?.maxUsuarios ?? 3
  const isOwnAccount = (userId: number) => session?.user?.id === userId

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">Administrar usuarios y permisos del sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {users.length} / {maxUsers} usuarios
          </Badge>
          <Button onClick={openCreateDialog} size="sm">
            <UserPlus className="h-4 w-4 mr-1" />
            Crear Usuario
          </Button>
        </div>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nombre</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Rol</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">Almacén</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Último Acceso</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: UserRow) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-sm">{user.nombre}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] font-medium ${ROL_COLORS[user.rol] || ''}`}>
                          <Shield className="h-2.5 w-2.5 mr-1" />
                          {ROL_LABELS[user.rol] || user.rol}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{user.almacen?.nombre ?? 'Sin asignar'}</TableCell>
                      <TableCell>
                        <Switch
                          checked={user.activo}
                          disabled={isOwnAccount(user.id)}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: user.id, activo: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                        {user.ultimoAcceso
                          ? new Date(user.ultimoAcceso).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Nunca'}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.rol !== 'super_admin' && <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(user)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => {
                              if (isOwnAccount(user.id)) {
                                toast.error('No puede eliminar su propia cuenta')
                                return
                              }
                              setDeleteTarget(user)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuario' : 'Crear Usuario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre completo"
              />
            </div>
            {isSuperAdmin && !editingUser && (
              <div className="space-y-1.5">
                <Label className="text-xs">Empresa *</Label>
                <Select value={form.empresaId?.toString() ?? ''} onValueChange={(v) => setForm(f => ({ ...f, empresaId: Number(v), almacenId: null }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar empresa" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => <SelectItem key={company.id} value={company.id.toString()}>{company.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Almacén asignado *</Label>
              <Select value={form.almacenId?.toString() ?? ''} onValueChange={(v) => setForm(f => ({ ...f, almacenId: Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar almacén" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id.toString()}>{warehouse.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">El usuario solo operará el inventario y las ventas de este almacén.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Contraseña {editingUser && <span className="text-muted-foreground">(dejar vacío para no cambiar)</span>}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editingUser ? '••••••••' : 'Contraseña'}/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rol</Label>
              <Select value={form.rol} onValueChange={(v) => setForm(f => ({ ...f, rol: v }))} disabled={editingUser?.rol === 'admin'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editingUser?.rol === 'admin' && <SelectItem value="admin">Dueño de empresa</SelectItem>}
                  <SelectItem value="gerente">Gerente de almacén</SelectItem>
                  <SelectItem value="cajero">Cajero</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Activo</Label>
              <Switch
                checked={form.activo}
                onCheckedChange={(checked) => setForm(f => ({ ...f, activo: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente al usuario <strong>{deleteTarget?.nombre}</strong> ({deleteTarget?.email}).
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
