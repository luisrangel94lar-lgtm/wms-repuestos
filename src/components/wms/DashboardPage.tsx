'use client'

import { useQuery } from '@tanstack/react-query'
import { useWmsStore } from '@/store/wms'
import { formatCurrency, formatDate, tipoMovColors } from './lib/format'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  DollarSign,
  AlertTriangle,
  ShoppingCart,
  ArrowLeftRight,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  Download,
  BarChart3,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DashboardData {
  valorTotalStock: number
  productosBajoStock: { count: number; items: any[] }
  ventasHoy: { count: number; total: number }
  ventasSemana: { count: number; total: number }
  ventasMes: { count: number; total: number }
  movimientosHoy: number
  totalProductos: number
  totalClientes: number
}

function TrendIndicator({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const isUp = value >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? '+' : ''}{value}{suffix}
    </span>
  )
}

export function DashboardPage() {
  const { setCurrentPage } = useWmsStore()

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/wms/dashboard').then((r) => r.json()),
    refetchInterval: 30000,
  })

  const { data: recentMovements = [] } = useQuery({
    queryKey: ['recent-movements'],
    queryFn: () =>
      fetch('/api/wms/movimientos?limit=10')
        .then((r) => r.json())
        .then((items: any[]) => items.slice(0, 10)),
    refetchInterval: 30000,
  })

  const { data: dailySales = [] } = useQuery({
    queryKey: ['daily-sales'],
    queryFn: () => fetch('/api/wms/dashboard/daily-sales').then(r => r.json()),
  })

  const { data: topSellers = [] } = useQuery({
    queryKey: ['dashboard-top-sellers'],
    queryFn: () =>
      fetch('/api/wms/reportes/top-vendidos?limit=5').then((r) => r.json()),
  })

  const salesChartData = dailySales

  const topSellersChart = topSellers.slice(0, 5).map((item: any) => ({
    nombre: item.producto?.nombre?.substring(0, 20) ?? 'N/A',
    cantidad: item.cantidadVendida,
  }))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Stock Total */}
        <Card className="rounded-xl shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md hover:-translate-y-px transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Total Valorizado</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(data?.valorTotalStock ?? 0)}
                </p>
                <div className="mt-1">
                  <TrendIndicator value={3.2} />
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bajo Mínimo */}
        <Card
          className="rounded-xl shadow-sm border-l-4 border-l-destructive hover:shadow-md hover:-translate-y-px transition-all duration-200 cursor-pointer"
          onClick={() => setCurrentPage('alerts')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bajo Mínimo</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                  </span>
                  <p className="text-2xl font-bold text-destructive">
                    {data?.productosBajoStock?.count ?? 0}
                  </p>
                </div>
                <div className="mt-1">
                  <TrendIndicator value={-2} />
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ventas */}
        <Card className="rounded-xl shadow-sm border-l-4 border-l-primary hover:shadow-md hover:-translate-y-px transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ventas del Mes</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(data?.ventasMes?.total ?? 0)}
                </p>
                <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span>Día: <span className="font-medium text-foreground">{formatCurrency(data?.ventasHoy?.total ?? 0)}</span></span>
                  <span>Sem: <span className="font-medium text-foreground">{formatCurrency(data?.ventasSemana?.total ?? 0)}</span></span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Movimientos */}
        <Card className="rounded-xl shadow-sm border-l-4 border-l-amber-500 hover:shadow-md hover:-translate-y-px transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Movimientos del Día</p>
                <p className="text-2xl font-bold mt-1">{data?.movimientosHoy ?? 0}</p>
                <div className="mt-1">
                  <TrendIndicator value={8.5} />
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <ArrowLeftRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Productos */}
        <Card className="rounded-xl shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md hover:-translate-y-px transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Productos</p>
                <p className="text-2xl font-bold mt-1">{data?.totalProductos ?? 0}</p>
                <div className="mt-1">
                  <TrendIndicator value={1.2} />
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Clientes */}
        <Card className="rounded-xl shadow-sm border-l-4 border-l-primary hover:shadow-md hover:-translate-y-px transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold mt-1">{data?.totalClientes ?? 0}</p>
                <div className="mt-1">
                  <TrendIndicator value={5.0} />
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 cursor-pointer group" onClick={() => setCurrentPage('receiving')}>
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <Download className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-center">Nueva Recepción</span>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 cursor-pointer group" onClick={() => setCurrentPage('sales')}>
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-center">Nueva Venta</span>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 cursor-pointer group" onClick={() => setCurrentPage('products')}>
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-center">Agregar Producto</span>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 cursor-pointer group" onClick={() => setCurrentPage('reports')}>
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-center">Ver Reportes</span>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">Resumen operativo del almacén de repuestos</p>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ventas Últimos 7 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--popover)',
                      color: 'var(--popover-foreground)',
                    }}
                  />
                  <Bar dataKey="ventas" fill="oklch(0.55 0.15 145)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 5 Productos Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSellersChart} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--popover)',
                      color: 'var(--popover-foreground)',
                    }}
                  />
                  <Bar dataKey="cantidad" fill="oklch(0.65 0.12 35)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent movements */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Últimos Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="text-xs">Producto</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs text-right">Cant.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMovements.slice(0, 10).map((m: any) => (
                  <TableRow key={m.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs py-2">
                      {formatDate(m.fecha)}
                    </TableCell>
                    <TableCell className="text-xs py-2 font-medium">
                      {m.producto?.nombre?.substring(0, 25)}
                    </TableCell>
                    <TableCell className="text-xs py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          tipoMovColors[m.tipoMovimiento?.nombre] ?? 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {m.tipoMovimiento?.nombre}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs py-2 text-right font-mono">
                      {m.cantidad}
                    </TableCell>
                  </TableRow>
                ))}
                {recentMovements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">
                      Sin movimientos registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Alertas de Stock</CardTitle>
              <Badge
                variant="destructive"
                className="cursor-pointer"
                onClick={() => setCurrentPage('alerts')}
              >
                Ver todas
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Producto</TableHead>
                  <TableHead className="text-xs text-center">Actual</TableHead>
                  <TableHead className="text-xs text-center">Mínimo</TableHead>
                  <TableHead className="text-xs text-center">Faltan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.productosBajoStock?.items ?? []).slice(0, 10).map((p: any) => {
                  const totalStock = (p.stocks ?? []).reduce((s: number, st: any) => s + st.cantidad, 0)
                  const deficiencia = p.stockMinimo - totalStock
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs py-2 font-medium">
                        {p.nombre?.substring(0, 25)}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-center font-mono">
                        {totalStock}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-center font-mono">
                        {p.stockMinimo}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-center">
                        <span className="text-destructive font-semibold">-{deficiencia}</span>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {(!data?.productosBajoStock?.items || data.productosBajoStock.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">
                      Sin alertas de stock
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
