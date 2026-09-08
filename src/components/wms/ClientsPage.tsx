'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
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
import { Plus, Search, Pencil, Trash2, Eye, History, ChevronDown, ChevronRight, Users, Wallet, TrendingUp, UserCircle, Contact, BadgeCheck, Upload, Download, FileSpreadsheet } from 'lucide-react'
import { formatCurrency, formatDate } from './lib/format'
import { downloadCsvTemplate } from '@/lib/download-csv'
import { useWmsStore } from '@/store/wms'

const clienteSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  tipoCliente: z.string(),
})

type ClienteFormData = z.infer<typeof clienteSchema>

export function ClientsPage() {
  const queryClient = useQueryClient()
  const { session } = useWmsStore()
  const canBulkManage = session?.user?.rol === 'admin'
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [viewId, setViewId] = useState<number | null>(null)
  const [historyId, setHistoryId] = useState<number | null>(null)
  const [expandedSales, setExpandedSales] = useState<Set<number>>(new Set())
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

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

  const { data: historyData } = useQuery({
    queryKey: ['cliente-historial', historyId],
    queryFn: () => fetch(`/api/wms/clientes/${historyId}/historial`).then((r) => r.json()),
    enabled: !!historyId,
  })

  const form = useForm<ClienteFormData>({ resolver: zodResolver(clienteSchema) as any, defaultValues: { nombre: '', telefono: '', email: '', tipoCliente: 'Tecnico' } })
  const tipoCliente = useWatch({ control: form.control, name: 'tipoCliente' })

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

  function toggleExpand(saleId: number) {
    setExpandedSales((prev) => {
      const next = new Set(prev)
      if (next.has(saleId)) next.delete(saleId)
      else next.add(saleId)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="flex flex-wrap gap-3">
        <Card className="card-hover rounded-lg px-4 py-2.5 shadow-sm border">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Total Clientes</p>
              <p className="text-lg font-bold stat-number">{clientes.length}</p>
            </div>
          </div>
        </Card>
        <Card className="card-hover rounded-lg px-4 py-2.5 shadow-sm border">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Total Compras</p>
              <p className="text-lg font-bold stat-number">{clientes.reduce((s: number, c: any) => s + ((c as any)._count?.ventas ?? 0), 0)}</p>
            </div>
          </div>
        </Card>
        <Card className="card-hover rounded-lg px-4 py-2.5 shadow-sm border">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Promedio Compras</p>
              <p className="text-lg font-bold stat-number">{clientes.length > 0 ? (clientes.reduce((s: number, c: any) => s + ((c as any)._count?.ventas ?? 0), 0) / clientes.length).toFixed(1) : '0'}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o teléfono..." className="pl-9" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          </div>
          <Button variant="outline" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2">
          {canBulkManage && <Button variant="outline" onClick={() => setShowImport(true)}><Upload className="h-4 w-4 mr-1" /> Importar CSV</Button>}
          <Button onClick={() => { form.reset(); setShowCreate(true) }}><Plus className="h-4 w-4 mr-1" /> Nuevo Cliente</Button>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Base de datos de técnicos y clientes</p>
      </div>

      <Card className="rounded-xl shadow-sm transition-all duration-200">
        <CardContent className="p-0">
          <div className="table-container max-h-[calc(100vh-14rem)] overflow-y-auto">
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
                  <TableRow><TableCell colSpan={6} className="text-center py-12">
                    <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm">No hay clientes registrados</p>
                    <p className="text-muted-foreground/60 text-xs mt-1">Agrega técnicos y clientes desde el botón "Nuevo Cliente"</p>
                  </TableCell></TableRow>
                )}
                {!isLoading && clientes.map((c: any) => (
                  <TableRow key={c.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-medium py-2">{c.nombre}</TableCell>
                    <TableCell className="text-xs py-2 hidden md:table-cell">{c.telefono ?? '-'}</TableCell>
                    <TableCell className="text-xs py-2 hidden lg:table-cell">{c.email ?? '-'}</TableCell>
                    <TableCell className="text-xs py-2 hidden sm:table-cell">{c.tipoCliente}</TableCell>
                    <TableCell className="text-xs text-center py-2">
                      <span className="font-mono">{(c as any)._count?.ventas ?? 0}</span>
                    </TableCell>
                    <TableCell className="text-xs text-right py-2">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setHistoryId(c.id); setExpandedSales(new Set()) }} title="Historial"><History className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewId(c.id)}><Eye className="h-3.5 w-3.5" /></Button>
                        {canBulkManage && (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showImport} onOpenChange={(open) => { if (!open) { setShowImport(false); setImportFile(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="dialog-header-accent">
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Importar clientes</DialogTitle>
            <DialogDescription>Carga varios clientes usando la plantilla CSV.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => downloadCsvTemplate('plantilla-clientes.csv', [
                ['nombre', 'telefono', 'email', 'tipoCliente'],
                ['Cliente de ejemplo', '3001234567', 'cliente@ejemplo.com', 'Tecnico'],
              ])}
            >
              <Download className="h-4 w-4 mr-2" /> Descargar plantilla de clientes
            </Button>
            <div className="space-y-2">
              <Label>Archivo CSV diligenciado</Label>
              <Input type="file" accept=".csv,text/csv" onChange={(event) => setImportFile(event.target.files?.[0] ?? null)} />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p><strong>tipoCliente:</strong> Tecnico, Empresa o Particular.</p>
              <p>Los clientes repetidos por email —o por nombre y teléfono— se omitirán.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImport(false); setImportFile(null) }}>Cancelar</Button>
            <Button
              disabled={!importFile || importing}
              onClick={async () => {
                if (!importFile) return
                setImporting(true)
                try {
                  const data = new FormData()
                  data.append('file', importFile)
                  const response = await fetch('/api/wms/clientes/import', { method: 'POST', body: data })
                  const result = await response.json()
                  if (!response.ok) throw new Error(result.error || 'Error al importar clientes')
                  toast.success(`${result.imported} clientes importados, ${result.skipped} omitidos`)
                  if (result.errors?.length) toast.warning(`${result.errors.length} filas con errores`)
                  queryClient.invalidateQueries({ queryKey: ['clientes'] })
                  setShowImport(false)
                  setImportFile(null)
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Error al importar clientes')
                } finally {
                  setImporting(false)
                }
              }}
            >
              {importing ? 'Importando...' : 'Importar clientes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate || !!editId} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditId(null); form.reset() } }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="dialog-header-accent"><DialogTitle>{editId ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle><DialogDescription className="sr-only">{editId ? 'Formulario para editar los datos del cliente' : 'Formulario para crear un nuevo cliente'}</DialogDescription></DialogHeader>
          <form onSubmit={form.handleSubmit((values: any) => {
            if (editId) updateMutation.mutate({ id: editId, values })
            else createMutation.mutate(values)
          })} className="space-y-4">
            <div className="form-section-header"><UserCircle className="h-3.5 w-3.5" /> Información Personal</div>
            <div className="space-y-2"><Label className="text-sm font-medium">Nombre *</Label><Input {...form.register('nombre')} />{form.formState.errors.nombre && <p className="text-xs text-destructive">{form.formState.errors.nombre.message}</p>}</div>

            <hr className="form-section-divider" />

            <div className="form-section-header"><Contact className="h-3.5 w-3.5" /> Contacto</div>
            <div className="space-y-2"><Label className="text-sm font-medium">Teléfono</Label><Input {...form.register('telefono')} /></div>
            <div className="space-y-2"><Label className="text-sm font-medium">Email</Label><Input {...form.register('email')} type="email" />{form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}</div>

            <hr className="form-section-divider" />

            <div className="form-section-header"><BadgeCheck className="h-3.5 w-3.5" /> Clasificación</div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de Cliente</Label>
              <Select value={tipoCliente} onValueChange={(v) => form.setValue('tipoCliente', v)}>
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

      {/* Purchase History Dialog */}
      <Dialog open={!!historyId} onOpenChange={(open) => { if (!open) setHistoryId(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de Compras</DialogTitle>
            <DialogDescription className="sr-only">Historial completo de compras del cliente</DialogDescription>
          </DialogHeader>
          {historyData && (
            <div className="space-y-4">
              {/* Client info header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                <div><span className="text-muted-foreground">Nombre:</span> <span className="font-medium">{historyData.cliente?.nombre}</span></div>
                <div><span className="text-muted-foreground">Teléfono:</span> {historyData.cliente?.telefono ?? '-'}</div>
                <div><span className="text-muted-foreground">Email:</span> {historyData.cliente?.email ?? '-'}</div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="rounded-lg shadow-sm">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Total Compras</p>
                    <p className="text-lg font-bold mt-0.5">{historyData.resumen?.totalCompras ?? 0}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-lg shadow-sm">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Monto Total</p>
                    <p className="text-lg font-bold mt-0.5">{formatCurrency(historyData.resumen?.montoTotal ?? 0)}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-lg shadow-sm">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Última Compra</p>
                    <p className="text-sm font-medium mt-1">{historyData.resumen?.ultimaCompra ? formatDate(historyData.resumen.ultimaCompra) : 'N/A'}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Purchases table with expandable rows */}
              {historyData.ventas && historyData.ventas.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-8"></TableHead>
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Folio</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                      <TableHead className="text-xs text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.ventas.map((v: any) => {
                      const isExpanded = expandedSales.has(v.id)
                      return (
                        <>
                          <TableRow key={v.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => toggleExpand(v.id)}>
                            <TableCell className="py-2">
                              {v.detalles?.length > 0 && (
                                isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="text-xs py-2">{formatDate(v.fecha)}</TableCell>
                            <TableCell className="text-xs py-2 font-mono">{v.folio}</TableCell>
                            <TableCell className="text-xs text-right py-2">{formatCurrency(v.total ?? 0)}</TableCell>
                            <TableCell className="text-xs text-center py-2">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                v.estado === 'COMPLETADA'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                              }`}>
                                {v.estado}
                              </span>
                            </TableCell>
                          </TableRow>
                          {isExpanded && v.detalles && v.detalles.length > 0 && (
                            <TableRow key={`${v.id}-details`}>
                              <TableCell colSpan={5} className="bg-muted/30 p-0">
                                <div className="px-8 py-2">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-[10px]">Producto</TableHead>
                                        <TableHead className="text-[10px] text-center">Cantidad</TableHead>
                                        <TableHead className="text-[10px] text-right">Precio Unit.</TableHead>
                                        <TableHead className="text-[10px] text-right">Subtotal</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {v.detalles.map((d: any) => (
                                        <TableRow key={d.id}>
                                          <TableCell className="text-xs py-1">{d.producto?.nombre ?? 'N/A'}</TableCell>
                                          <TableCell className="text-xs py-1 text-center font-mono">{d.cantidad}</TableCell>
                                          <TableCell className="text-xs py-1 text-right">{formatCurrency(d.precioUnitario)}</TableCell>
                                          <TableCell className="text-xs py-1 text-right">{formatCurrency(d.cantidad * d.precioUnitario)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sin compras registradas</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View detail dialog */}
      <Dialog open={!!viewId} onOpenChange={(open) => { if (!open) setViewId(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="dialog-header-accent"><DialogTitle>Historial del Cliente</DialogTitle><DialogDescription className="sr-only">Historial de compras del cliente seleccionado</DialogDescription></DialogHeader>
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
