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

  const { data: topSellers = [] } = useQuery({
    queryKey: ['dashboard-top-sellers'],
    queryFn: () =>
      fetch('/api/wms/reportes/top-vendidos?limit=5').then((r) => r.json()),
  })

  // Sales chart data - generate last 7 days
  const salesChartData = (() => {
    if (!data) return []
    // We don't have per-day data from the API, so use a placeholder with summary
    return [
      { name: 'Hoy', ventas: data.ventasHoy.total },
      { name: 'Semana', ventas: data.ventasSemana.total },
      { name: 'Mes', ventas: data.ventasMes.total },
    ]
  })()

  const topSellersChart = topSellers.slice(0, 5).map((item: any) => ({
    nombre: item.producto?.nombre?.substring(0, 20) ?? 'N/A',
    cantidad: item.cantidadVendida,
  }))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Total Valorizado</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(data?.valorTotalStock ?? 0)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="rounded-xl shadow-sm cursor-pointer"
          onClick={() => setCurrentPage('alerts')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bajo Mínimo</p>
                <p className="text-2xl font-bold mt-1 text-destructive">
                  {data?.productosBajoStock?.count ?? 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ventas</p>
                <div className="flex gap-3 mt-1">
                  <div>
                    <p className="text-xs text-muted-foreground">Día</p>
                    <p className="text-sm font-semibold">{formatCurrency(data?.ventasHoy?.total ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Semana</p>
                    <p className="text-sm font-semibold">{formatCurrency(data?.ventasSemana?.total ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mes</p>
                    <p className="text-sm font-semibold">{formatCurrency(data?.ventasMes?.total ?? 0)}</p>
                  </div>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Movimientos del Día</p>
                <p className="text-2xl font-bold mt-1">{data?.movimientosHoy ?? 0}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Productos</p>
                <p className="text-2xl font-bold mt-1">{data?.totalProductos ?? 0}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold mt-1">{data?.totalClientes ?? 0}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ventas</CardTitle>
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
                  <Bar dataKey="ventas" fill="var(--foreground)" radius={[4, 4, 0, 0]} />
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
                  <Bar dataKey="cantidad" fill="var(--foreground)" radius={[0, 4, 4, 0]} />
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
                  <TableRow key={m.id}>
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
                    <TableRow key={p.id}>
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
