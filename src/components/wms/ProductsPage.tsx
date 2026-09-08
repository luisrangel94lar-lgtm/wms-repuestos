'use client'

import { useWmsStore } from '@/store/wms'
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
import { Plus, Search, Eye, Pencil, Trash2, Filter, Activity, Barcode, Calculator, Package, DollarSign, Layers, Tag, ScanBarcode, Image, Upload, FileSpreadsheet, ArrowRight, Download, Warehouse } from 'lucide-react'
import { formatCurrency } from './lib/format'
import { cn } from '@/lib/utils'
import { BarcodeScanner } from './BarcodeScanner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { downloadCsvTemplate } from '@/lib/download-csv'
import {
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
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

function MarginCalculator({ costoUnitario, precioVenta }: { costoUnitario: number; precioVenta: number }) {
  const margen = precioVenta > 0 ? ((precioVenta - costoUnitario) / precioVenta) * 100 : 0
  const utilidad = precioVenta - costoUnitario
  const clampedMargin = Math.max(0, Math.min(100, margen))

  let barColor = 'bg-red-500'
  let textColor = 'text-red-600 dark:text-red-400'
  if (margen > 40) {
    barColor = 'bg-emerald-500'
    textColor = 'text-emerald-600 dark:text-emerald-400'
  } else if (margen >= 20) {
    barColor = 'bg-amber-500'
    textColor = 'text-amber-600 dark:text-amber-400'
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Calculator className="h-4 w-4 text-primary" />
        Calculadora de Margen
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Costo</p>
          <p className="text-sm font-mono font-semibold">{formatCurrency(costoUnitario)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Precio Venta</p>
          <p className="text-sm font-mono font-semibold">{formatCurrency(precioVenta)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Utilidad</p>
          <p className={cn('text-sm font-mono font-bold', utilidad > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            {formatCurrency(utilidad)}
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Margen</span>
          <span className={cn('font-bold font-mono', textColor)}>{margen.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', barColor)}
            style={{ width: `${clampedMargin}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Bajo (&lt;20%)</span>
          <span>Medio (20-40%)</span>
          <span>Alto (&gt;40%)</span>
        </div>
      </div>
    </div>
  )
}

export function ProductsPage() {
  const queryClient = useQueryClient()
  const { setCurrentPage, setReceivingProductId, session } = useWmsStore()
  const canManageCatalog = session?.user?.rol === 'admin'
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
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

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

  const { data: viewProductEquipos = [] } = useQuery({
    queryKey: ['product-equipos', viewId],
    queryFn: () => fetch('/api/wms/producto-equipo').then((r) => r.json()).then((data: any[]) =>
      Array.isArray(data) ? data.filter((pe: any) => pe.idProducto === viewId) : []
    ),
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={bajoStock ? 'default' : 'outline'}
                onClick={() => { setBajoStock(!bajoStock); setPage(1) }}
              >
                <Filter className="h-4 w-4 mr-1" />
                Bajo Stock
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mostrar solo productos bajo stock mínimo</TooltipContent>
          </Tooltip>
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
          {canManageCatalog && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => { form.reset(); setShowCreate(true) }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nuevo Producto
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Crear un nuevo producto en el catálogo</TooltipContent>
              </Tooltip>
              <Button variant="outline" onClick={() => setShowImport(true)}>
                <Upload className="h-4 w-4 mr-1" />
                Importar CSV
              </Button>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={() => setShowBarcode(true)}>
                <Barcode className="h-4 w-4 mr-1" />
                Código de Barras
              </Button>
            </TooltipTrigger>
            <TooltipContent>Buscar producto por código de barras</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Gestiona el catálogo de repuestos, equipos y compatibilidades</p>
      </div>

      {/* Table */}
      <Card className="rounded-xl shadow-sm transition-all duration-200">
        <CardContent className="p-0">
          <div className="table-container table-row-clickable max-h-[calc(100vh-14rem)] overflow-y-auto overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">SKU</TableHead>
                  <TableHead className="text-xs">Nombre</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Marca</TableHead>
                  <TableHead className="text-xs text-right hidden md:table-cell">Costo</TableHead>
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
                      <TableCell className="text-xs text-right py-2 hidden md:table-cell">
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
                          {canManageCatalog && (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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
          <DialogHeader className="dialog-header-accent">
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
            {/* Section: Información Básica */}
            <div className="form-section-header"><Tag className="h-3.5 w-3.5" /> Información Básica</div>
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

            <hr className="form-section-divider" />

            {/* Section: Códigos y Multimedia */}
            <div className="form-section-header"><ScanBarcode className="h-3.5 w-3.5" /> Códigos y Multimedia</div>
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

            <hr className="form-section-divider" />

            {/* Section: Precios */}
            <div className="form-section-header"><DollarSign className="h-3.5 w-3.5" /> Precios</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Costo Unitario</Label>
                <Input type="number" step="0.01" {...form.register('costoUnitario')} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Precio de Venta</Label>
                <Input type="number" step="0.01" {...form.register('precioVenta')} />
              </div>
            </div>

            {/* Margin Calculator */}
            <MarginCalculator
              costoUnitario={Number(form.watch('costoUnitario')) || 0}
              precioVenta={Number(form.watch('precioVenta')) || 0}
            />

            <hr className="form-section-divider" />

            {/* Section: Stock */}
            <div className="form-section-header"><Layers className="h-3.5 w-3.5" /> Stock</div>
            <div className="grid grid-cols-2 gap-4">
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

      {/* View Detail Dialog - Enhanced */}
      <Dialog open={!!viewId} onOpenChange={(open) => { if (!open) setViewId(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="dialog-header-accent">
            <DialogTitle>Detalle del Producto</DialogTitle>
            <DialogDescription className="sr-only">Información detallada del producto seleccionado</DialogDescription>
          </DialogHeader>
          {viewProduct && (() => {
            const totalStock = viewProduct.stocks?.reduce((sum: number, s: any) => sum + s.cantidad, 0) ?? viewProduct.totalStock ?? 0
            const margen = viewProduct.precioVenta > 0 ? ((viewProduct.precioVenta - viewProduct.costoUnitario) / viewProduct.precioVenta) * 100 : 0
            const maxStockBar = Math.max(totalStock, viewProduct.stockMinimo, viewProduct.stockMaximo ?? 0, 1)
            const stockBarPercent = (totalStock / maxStockBar) * 100
            const minBarPercent = (viewProduct.stockMinimo / maxStockBar) * 100
            const maxBarPercent = viewProduct.stockMaximo ? (viewProduct.stockMaximo / maxStockBar) * 100 : 0
            const marginClamped = Math.max(0, Math.min(100, margen))
            let marginBarColor = 'bg-red-500'
            let marginTextColor = 'text-red-600 dark:text-red-400'
            if (margen > 40) {
              marginBarColor = 'bg-emerald-500'
              marginTextColor = 'text-emerald-600 dark:text-emerald-400'
            } else if (margen >= 20) {
              marginBarColor = 'bg-amber-500'
              marginTextColor = 'text-amber-600 dark:text-amber-400'
            }
            const stockStatusColor = totalStock === 0 ? 'bg-red-500' : totalStock < viewProduct.stockMinimo ? 'bg-amber-500' : 'bg-emerald-500'
            const equiposList = viewProductEquipos.length > 0
              ? viewProductEquipos
              : (viewProduct.productoEquipo ?? [])

            return (
              <div className="space-y-4 animate-page-transition">
                {/* Product Info Card */}
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    {viewProduct.fotoUrl && (
                      <img
                        src={viewProduct.fotoUrl}
                        alt={viewProduct.nombre}
                        className="w-16 h-16 object-cover rounded-lg border shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{viewProduct.sku}</span>
                        <span className={cn('h-2 w-2 rounded-full shrink-0', stockStatusColor)} />
                      </div>
                      <p className="text-base font-semibold truncate">{viewProduct.nombre}</p>
                    </div>
                  </div>
                  {viewProduct.descripcion && (
                    <p className="text-xs text-muted-foreground">{viewProduct.descripcion}</p>
                  )}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-0.5">Categoría</p>
                      <p className="font-medium">{viewProduct.categoria?.nombre ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Marca</p>
                      <p className="font-medium">{viewProduct.marca?.nombre ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Unidad</p>
                      <p className="font-medium capitalize">{viewProduct.unidadMedida}</p>
                    </div>
                  </div>
                </div>

                {/* Pricing Card */}
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> Precios y Margen
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Costo</p>
                      <p className="text-sm font-mono font-semibold">{formatCurrency(viewProduct.costoUnitario)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Precio Venta</p>
                      <p className="text-sm font-mono font-semibold">{formatCurrency(viewProduct.precioVenta)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Utilidad</p>
                      <p className={cn('text-sm font-mono font-bold', (viewProduct.precioVenta - viewProduct.costoUnitario) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                        {formatCurrency(viewProduct.precioVenta - viewProduct.costoUnitario)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Margen</span>
                      <span className={cn('font-bold', marginTextColor)}>{margen.toFixed(1)}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-300', marginBarColor)} style={{ width: `${marginClamped}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Bajo (&lt;20%)</span>
                      <span>Medio (20-40%)</span>
                      <span>Alto (&gt;40%)</span>
                    </div>
                  </div>
                </div>

                {/* Stock Card */}
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> Stock
                  </p>
                  <div className="flex items-end justify-between mb-1">
                    <div>
                      <p className="text-2xl font-bold">{totalStock}</p>
                      <p className="text-[10px] text-muted-foreground">unidades en total</p>
                    </div>
                    <div className="text-right text-xs space-y-0.5">
                      <p className="text-muted-foreground">Mín: <span className="font-mono font-medium text-foreground">{viewProduct.stockMinimo}</span></p>
                      {viewProduct.stockMaximo && <p className="text-muted-foreground">Máx: <span className="font-mono font-medium text-foreground">{viewProduct.stockMaximo}</span></p>}
                    </div>
                  </div>
                  <div className="relative h-4 w-full bg-muted rounded-full overflow-hidden">
                    {viewProduct.stockMaximo && <div className="absolute inset-y-0 left-0 bg-primary/10 rounded-full" style={{ width: `${maxBarPercent}%` }} />}
                    <div className="absolute bottom-0 left-0 h-0.5 w-full">
                      <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${minBarPercent}%` }} />
                    </div>
                    <div className={cn('absolute inset-y-0.5 left-0 rounded-full transition-all duration-500', stockStatusColor)} style={{ width: `${stockBarPercent}%` }} />
                  </div>
                  {viewProduct.stocks && viewProduct.stocks.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {viewProduct.stocks.map((s: any) => (
                        <Badge key={s.idUbicacion} variant="outline" className="text-[10px]">
                          {s.ubicacion?.pasillo}-{s.ubicacion?.estante}-{s.ubicacion?.nivel}: <span className="font-mono font-semibold ml-0.5">{s.cantidad}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Compatible Equipment Card */}
                {equiposList.length > 0 && (
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" /> Equipos Compatibles
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {equiposList.map((pe: any) => (
                        <div key={pe.idEquipo} className="flex items-center gap-2 text-xs bg-background rounded-md px-3 py-2 border">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          <span className="font-medium truncate">{pe.equipo?.marca?.nombre} {pe.equipo?.modelo}</span>
                          <span className="text-muted-foreground text-[10px] ml-auto shrink-0">{pe.equipo?.tipo ?? ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const deficiency = viewProduct.stockMinimo - totalStock
                      setReceivingProductId(viewProduct.id, deficiency > 0 ? deficiency : null)
                      setCurrentPage('receiving')
                      setViewId(null)
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" /> Ir a Recepción
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage('inventory')
                      setViewId(null)
                    }}
                  >
                    <Warehouse className="h-4 w-4 mr-1" /> Ir a Inventario
                  </Button>
                  <div className="ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setTimelineId(viewProduct.id); setViewId(null) }}
                    >
                      <Activity className="h-4 w-4 mr-1" /> Ver Timeline
                    </Button>
                  </div>
                </div>
              </div>
            )
          })()}
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
                      <RechartsTooltip
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

      {/* CSV Import Dialog */}
      <Dialog open={showImport} onOpenChange={(open) => { if (!open) { setShowImport(false); setImportFile(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="dialog-header-accent">
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> Importar CSV
            </DialogTitle>
            <DialogDescription className="sr-only">Importar productos desde un archivo CSV</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Archivo CSV</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => downloadCsvTemplate('plantilla-productos.csv', [
                ['sku', 'nombre', 'descripcion', 'categoria', 'marca', 'codigoBarras', 'unidadMedida', 'costoUnitario', 'precioVenta', 'stockMinimo', 'stockMaximo', 'activo'],
                ['REP-001', 'Compresor 1/4 HP', 'Compresor para refrigeración', 'Compresores', 'Embraco', '770000000001', 'unidad', '250000', '350000', '2', '20', 'true'],
              ])}
            >
              <Download className="h-4 w-4 mr-2" /> Descargar plantilla de productos
            </Button>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium">Formato esperado (columnas del CSV):</p>
              <div className="flex flex-wrap gap-1">
                {['sku', 'nombre', 'descripcion', 'categoria', 'marca', 'codigoBarras', 'unidadMedida', 'costoUnitario', 'precioVenta', 'stockMinimo', 'stockMaximo', 'activo'].map((col) => (
                  <code key={col} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{col}</code>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Los SKUs existentes se omitirán. Categorías y marcas deben existir previamente (se buscan por nombre).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImport(false); setImportFile(null) }}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!importFile) return
                setImporting(true)
                try {
                  const formData = new FormData()
                  formData.append('file', importFile)
                  const res = await fetch('/api/wms/productos/import', { method: 'POST', body: formData })
                  const data = await res.json()
                  if (!res.ok) {
                    toast.error(data.error ?? 'Error al importar')
                  } else {
                    toast.success(`${data.imported} productos importados, ${data.skipped} omitidos`)
                    if (data.errors?.length > 0) {
                      toast.warning(`${data.errors.length} errores: ${data.errors.slice(0, 3).join('; ')}`)
                    }
                    queryClient.invalidateQueries({ queryKey: ['products'] })
                    setShowImport(false)
                    setImportFile(null)
                  }
                } catch {
                  toast.error('Error de conexión')
                } finally {
                  setImporting(false)
                }
              }}
              disabled={!importFile || importing}
            >
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
