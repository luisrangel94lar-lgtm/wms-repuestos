'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Eye, Pencil, Trash2, Filter, Activity, Barcode } from 'lucide-react'
import { formatCurrency } from './lib/format'
import { BarcodeScanner } from './BarcodeScanner'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const productSchema = z.object({
  sku: z.string().min(1, 'SKU requerido'),
  nombre: z.string().min(1, 'Nombre requerido'),
  descripcion: z.string().optional(),
  idCategoria: z.coerce.number().nullable().optional(),
  idMarca: z.coerce.number().nullable().optional(),
  codigoBarras: z.string().optional(),
  unidadMedida: z.string().default('unidad'),
  costoUnitario: z.coerce.number().min(0),
  precioVenta: z.coerce.number().min(0),
  stockMinimo: z.coerce.number().min(0),
  stockMaximo: z.coerce.number().nullable().optional(),
  fotoUrl: z.string().optional(),
  activo: z.boolean().default(true),
})

type ProductFormData = z.infer<typeof productSchema>

interface Product {
  id: number
  sku: string
  nombre: string
  descripcion: string | null
  idCategoria: number | null
  idMarca: number | null
  codigoBarras: string | null
  unidadMedida: string
  costoUnitario: number
  precioVenta: number
  stockMinimo: number
  stockMaximo: number | null
  fotoUrl: string | null
  activo: boolean
  fechaCreacion: string
  categoria: { id: number; nombre: string } | null
  marca: { id: number; nombre: string } | null
  stocks: { idProducto: number; idUbicacion: number; cantidad: number }[]
  totalStock: number
}

interface CategoriasResponse {
  items?: Product[]
  total: number
}

export function ProductsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [idCategoria, setIdCategoria] = useState('')
  const [idMarca, setIdMarca] = useState('')
  const [bajoStock, setBajoStock] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [viewId, setViewId] = useState<number | null>(null)
  const [timelineId, setTimelineId] = useState<number | null>(null)
  const [showBarcode, setShowBarcode] = useState(false)

  const { data, isLoading } = useQuery<CategoriasResponse>({
    queryKey: ['products', page, search, idCategoria, idMarca, bajoStock],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      })
      if (search) params.set('search', search)
      if (idCategoria) params.set('categoria', idCategoria)
      if (idMarca) params.set('marca', idMarca)
      if (bajoStock) params.set('bajoStock', 'true')
      return fetch(`/api/wms/productos?${params}`).then((r) => r.json())
    },
  })

  const { data: viewProduct } = useQuery({
    queryKey: ['product-detail', viewId],
    queryFn: () => fetch(`/api/wms/productos/${viewId}`).then((r) => r.json()),
    enabled: !!viewId,
  })

  const { data: timelineData } = useQuery({
    queryKey: ['product-timeline', timelineId],
    queryFn: () => fetch(`/api/wms/productos/${timelineId}/timeline`).then((r) => r.json()),
    enabled: !!timelineId,
  })

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-list'],
    queryFn: () => fetch('/api/wms/categorias').then((r) => r.json()),
  })

  const { data: marcas = [] } = useQuery({
    queryKey: ['marcas-list'],
    queryFn: () => fetch('/api/wms/marcas').then((r) => r.json()),
  })

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      sku: '',
      nombre: '',
      descripcion: '',
      idCategoria: null,
      idMarca: null,
      codigoBarras: '',
      unidadMedida: 'unidad',
      costoUnitario: 0,
      precioVenta: 0,
      stockMinimo: 0,
      stockMaximo: null,
      fotoUrl: '',
      activo: true,
    },
  })

  const createMutation = useMutation({
    mutationFn: (values: ProductFormData) =>
      fetch('/api/wms/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      toast.success('Producto creado correctamente')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setShowCreate(false)
      form.reset()
    },
    onError: (err: any) => {
      toast.error(err.error ?? 'Error al crear producto')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: ProductFormData }) =>
      fetch(`/api/wms/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      toast.success('Producto actualizado correctamente')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setEditId(null)
      form.reset()
    },
    onError: (err: any) => {
      toast.error(err.error ?? 'Error al actualizar producto')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/wms/productos/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      toast.success('Producto eliminado')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setDeleteId(null)
    },
    onError: (err: any) => {
      toast.error(err.error ?? 'Error al eliminar producto')
    },
  })

  function openEdit(product: Product) {
    setEditId(product.id)
    form.reset({
      sku: product.sku,
      nombre: product.nombre,
      descripcion: product.descripcion ?? '',
      idCategoria: product.idCategoria,
      idMarca: product.idMarca,
      codigoBarras: product.codigoBarras ?? '',
      unidadMedida: product.unidadMedida,
      costoUnitario: product.costoUnitario,
      precioVenta: product.precioVenta,
      stockMinimo: product.stockMinimo,
      stockMaximo: product.stockMaximo,
      fotoUrl: product.fotoUrl ?? '',
      activo: product.activo,
    })
  }

  function handleSearch() {
    setSearch(searchInput)
    setPage(1)
  }

  const items: Product[] = data?.items ?? []
  const totalPages = Math.ceil((data?.total ?? 0) / 20)

  function getStockStatus(p: Product) {
    if (p.totalStock === 0) return 'out'
    if (p.totalStock < p.stockMinimo) return 'low'
    return 'ok'
  }

  function StatusBadge({ status }: { status: string }) {
    if (status === 'out')
      return <Badge variant="destructive" className="text-[10px]">Sin Stock</Badge>
    if (status === 'low')
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-[10px]">
          Bajo
        </Badge>
      )
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]">
        OK
      </Badge>
    )
  }

  const chartData = useMemo(() => {
    if (!timelineData?.timeline) return []
    return timelineData.timeline.map((t: any) => ({
      fecha: new Date(t.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      stock: t.balance,
    }))
  }, [timelineData])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o SKU..."
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant={bajoStock ? 'default' : 'outline'}
            onClick={() => { setBajoStock(!bajoStock); setPage(1) }}
          >
            <Filter className="h-4 w-4 mr-1" />
            Bajo Stock
          </Button>
          <Select value={idCategoria} onValueChange={(v) => { setIdCategoria(v === '_all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas</SelectItem>
              {categorias.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={idMarca} onValueChange={(v) => { setIdMarca(v === '_all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas</SelectItem>
              {marcas.map((m: any) => (
                <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { form.reset(); setShowCreate(true) }}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo Producto
          </Button>
          <Button variant="outline" onClick={() => setShowBarcode(true)}>
            <Barcode className="h-4 w-4 mr-1" />
            Código de Barras
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Gestiona el catálogo de repuestos, equipos y compatibilidades</p>
      </div>

      {/* Table */}
      <Card className="rounded-xl shadow-sm transition-all duration-200">
        <CardContent className="p-0">
          <div className="table-container max-h-[calc(100vh-14rem)] overflow-y-auto overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">SKU</TableHead>
                  <TableHead className="text-xs">Nombre</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Marca</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Costo</TableHead>
                  <TableHead className="text-xs text-right">Precio</TableHead>
                  <TableHead className="text-xs text-center">Stock</TableHead>
                  <TableHead className="text-xs text-center">Estado</TableHead>
                  <TableHead className="text-xs text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j} className="py-2">
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {!isLoading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No se encontraron productos
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  items.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-mono py-2">{p.sku}</TableCell>
                      <TableCell className="text-xs font-medium py-2 max-w-[200px] truncate">
                        {p.nombre}
                      </TableCell>
                      <TableCell className="text-xs py-2 hidden md:table-cell">
                        {p.categoria?.nombre ?? '-'}
                      </TableCell>
                      <TableCell className="text-xs py-2 hidden lg:table-cell">
                        {p.marca?.nombre ?? '-'}
                      </TableCell>
                      <TableCell className="text-xs text-right py-2 hidden sm:table-cell">
                        {formatCurrency(p.costoUnitario)}
                      </TableCell>
                      <TableCell className="text-xs text-right py-2">
                        {formatCurrency(p.precioVenta)}
                      </TableCell>
                      <TableCell className="text-xs text-center font-mono py-2">
                        {p.totalStock}
                      </TableCell>
                      <TableCell className="text-xs text-center py-2">
                        <StatusBadge status={getStockStatus(p)} />
                      </TableCell>
                      <TableCell className="text-xs text-right py-2">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewId(p.id)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {(data?.total ?? 0)} productos encontrados
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span className="px-3 py-1 text-sm">{page} / {totalPages || 1}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Siguiente
          </Button>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate || !!editId} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditId(null); form.reset() } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
            <DialogDescription className="sr-only">{editId ? 'Formulario para editar los datos del producto' : 'Formulario para crear un nuevo producto'}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values: any) => {
              if (editId) {
                updateMutation.mutate({ id: editId, values })
              } else {
                createMutation.mutate(values)
              }
            })}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">SKU *</Label>
                <Input {...form.register('sku')} />
                {form.formState.errors.sku && (
                  <p className="text-xs text-destructive">{form.formState.errors.sku.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Unidad de Medida</Label>
                <Select value={form.watch('unidadMedida')} onValueChange={(v) => form.setValue('unidadMedida', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidad">Unidad</SelectItem>
                    <SelectItem value="par">Par</SelectItem>
                    <SelectItem value="metro">Metro</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="litro">Litro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nombre *</Label>
              <Input {...form.register('nombre')} />
              {form.formState.errors.nombre && (
                <p className="text-xs text-destructive">{form.formState.errors.nombre.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Descripción</Label>
              <Textarea {...form.register('descripcion')} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Código de Barras</Label>
                <Input {...form.register('codigoBarras')} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">URL de Foto</Label>
                <Input {...form.register('fotoUrl')} />
              </div>
            </div>
            {form.watch('fotoUrl') && (
              <div className="mt-2">
                <img
                  src={form.watch('fotoUrl')}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg border"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Costo Unitario</Label>
                <Input type="number" step="0.01" {...form.register('costoUnitario')} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Precio de Venta</Label>
                <Input type="number" step="0.01" {...form.register('precioVenta')} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Stock Mínimo</Label>
                <Input type="number" {...form.register('stockMinimo')} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Stock Máximo</Label>
                <Input type="number" {...form.register('stockMaximo')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setEditId(null); form.reset() }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={!!viewId} onOpenChange={(open) => { if (!open) setViewId(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Producto</DialogTitle>
            <DialogDescription className="sr-only">Información detallada del producto seleccionado</DialogDescription>
          </DialogHeader>
          {viewProduct && (
            <div className="space-y-4">
              {viewProduct.fotoUrl && (
                <div className="flex justify-center">
                  <img
                    src={viewProduct.fotoUrl}
                    alt={viewProduct.nombre}
                    className="w-32 h-32 object-cover rounded-lg border"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">SKU:</span> <span className="font-mono font-medium">{viewProduct.sku}</span></div>
                <div><span className="text-muted-foreground">Nombre:</span> <span className="font-medium">{viewProduct.nombre}</span></div>
                <div><span className="text-muted-foreground">Categoría:</span> {viewProduct.categoria?.nombre ?? '-'}</div>
                <div><span className="text-muted-foreground">Marca:</span> {viewProduct.marca?.nombre ?? '-'}</div>
                <div><span className="text-muted-foreground">Costo:</span> {formatCurrency(viewProduct.costoUnitario)}</div>
                <div><span className="text-muted-foreground">Precio:</span> {formatCurrency(viewProduct.precioVenta)}</div>
                <div><span className="text-muted-foreground">Stock Mínimo:</span> {viewProduct.stockMinimo}</div>
                <div><span className="text-muted-foreground">Unidad:</span> {viewProduct.unidadMedida}</div>
              </div>
              {viewProduct.descripcion && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Descripción:</span>
                  <p className="mt-1">{viewProduct.descripcion}</p>
                </div>
              )}
              {viewProduct.stocks && viewProduct.stocks.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium mb-2">Stock por Ubicación</p>
                  <div className="flex gap-2 flex-wrap">
                    {viewProduct.stocks.map((s: any) => (
                      <Badge key={s.idUbicacion} variant="outline">
                        Pasillo {s.ubicacion?.pasillo} - Estante {s.ubicacion?.estante} - Nivel {s.ubicacion?.nivel}: {s.cantidad}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {viewProduct.productoEquipo && viewProduct.productoEquipo.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium mb-2">Compatible con Equipos</p>
                  <div className="flex gap-2 flex-wrap">
                    {viewProduct.productoEquipo.map((pe: any) => (
                      <Badge key={pe.idEquipo} variant="secondary">
                        {pe.equipo?.marca?.nombre} {pe.equipo?.modelo}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setTimelineId(viewProduct.id); setViewId(null) }}
                >
                  <Activity className="h-4 w-4 mr-1" />
                  Ver Timeline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Timeline Dialog */}
      <Dialog open={!!timelineId} onOpenChange={(open) => { if (!open) setTimelineId(null) }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Timeline de Stock</DialogTitle>
            <DialogDescription className="sr-only">Evolución del stock del producto en los últimos 30 movimientos</DialogDescription>
          </DialogHeader>
          {timelineData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-muted-foreground">Stock Actual</p>
                  <p className="text-2xl font-bold">{timelineData.currentStock}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Producto ID</p>
                  <p className="font-mono">#{timelineData.productoId}</p>
                </div>
              </div>
              {chartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.55 0.15 145)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="oklch(0.55 0.15 145)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--popover)',
                          color: 'var(--popover-foreground)',
                        }}
                      />
                      <Area
                        type="stepAfter"
                        dataKey="stock"
                        stroke="oklch(0.55 0.15 145)"
                        fill="url(#stockGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  Sin datos de movimiento para mostrar
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BarcodeScanner open={showBarcode} onOpenChange={setShowBarcode} />
    </div>
  )
}
