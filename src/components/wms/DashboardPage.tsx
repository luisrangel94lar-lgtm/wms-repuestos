'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWmsStore } from '@/store/wms'
import { formatCurrency, formatDate, formatDateTime, tipoMovColors } from './lib/format'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DollarSign,
  AlertTriangle,
  ShoppingCart,
  ArrowLeftRight,
  Package,
  Users,
  Download,
  BarChart3,
  PackageOpen,
  Inbox,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  SlidersHorizontal,
  RotateCcw,
  ArrowUp,
  ArrowDown,
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
import { cn } from '@/lib/utils'

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

const colorMap: Record<string, { border: string; iconBg: string; iconColor: string; bg: string; ring: string; hoverBg: string; gradient: string }> = {
  emerald: {
    border: 'border-t-emerald-500',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    bg: 'from-emerald-50/60 to-transparent dark:from-emerald-950/20 dark:to-transparent',
    ring: 'ring-emerald-500/20',
    hoverBg: 'group-hover:bg-emerald-500/5',
    gradient: 'bg-gradient-to-br from-emerald-50/80 via-white dark:via-background to-emerald-100/30 dark:to-emerald-950/10',
  },
  red: {
    border: 'border-t-red-500',
    iconBg: 'bg-red-500/15',
    iconColor: 'text-red-600 dark:text-red-400',
    bg: 'from-red-50/60 to-transparent dark:from-red-950/20 dark:to-transparent',
    ring: 'ring-red-500/20',
    hoverBg: 'group-hover:bg-red-500/5',
    gradient: 'bg-gradient-to-br from-red-50/80 via-white dark:via-background to-red-100/30 dark:to-red-950/10',
  },
  primary: {
    border: 'border-t-primary',
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary',
    bg: 'from-primary/5 to-transparent dark:from-primary/950/20 dark:to-transparent',
    ring: 'ring-primary/20',
    hoverBg: 'group-hover:bg-primary/5',
    gradient: 'bg-gradient-to-br from-primary/5 via-white dark:via-background to-primary/3 dark:to-primary/5',
  },
  amber: {
    border: 'border-t-amber-500',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
    bg: 'from-amber-50/60 to-transparent dark:from-amber-950/20 dark:to-transparent',
    ring: 'ring-amber-500/20',
    hoverBg: 'group-hover:bg-amber-500/5',
    gradient: 'bg-gradient-to-br from-amber-50/80 via-white dark:via-background to-amber-100/30 dark:to-amber-950/10',
  },
  purple: {
    border: 'border-t-purple-500',
    iconBg: 'bg-purple-500/15',
    iconColor: 'text-purple-600 dark:text-purple-400',
    bg: 'from-purple-50/60 to-transparent dark:from-purple-950/20 dark:to-transparent',
    ring: 'ring-purple-500/20',
    hoverBg: 'group-hover:bg-purple-500/5',
    gradient: 'bg-gradient-to-br from-purple-50/80 via-white dark:via-background to-purple-100/30 dark:to-purple-950/10',
  },
}

/* Custom tooltip style for charts */
const tooltipStyle: React.CSSProperties = {
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
  boxShadow: '0 4px 16px oklch(0 0 0 / 10%), 0 0 0 1px oklch(0.55 0.15 160 / 8%)',
  padding: '10px 14px',
  fontSize: '13px',
}

function KpiCard({
  label,
  value,
  icon,
  color,
  subtitle,
  onClick,
  valueClassName,
  pulse,
  trend,
}: {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  color: string
  subtitle?: string
  onClick?: () => void
  valueClassName?: string
  pulse?: boolean
  trend?: number
}) {
  const c = colorMap[color] || colorMap.primary
  return (
    <Card
      onClick={onClick}
      className={cn(
        'rounded-xl shadow-sm border-t-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]',
        c.border,
        c.gradient,
        onClick && 'cursor-pointer',
        pulse && 'pulse-glow'
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className={cn('text-2xl font-bold tracking-tight animate-count-up stat-number', valueClassName)}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend !== undefined && trend !== 0 && (
              <p className={cn(
                'text-[11px] font-medium flex items-center gap-0.5',
                trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}>
                {trend > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(trend)}%
              </p>
            )}
          </div>
          <div
            className={cn(
              'h-11 w-11 rounded-xl flex items-center justify-center ring-1 shrink-0',
              c.iconBg,
              c.ring
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { setCurrentPage } = useWmsStore()
  const [chartDays, setChartDays] = useState(7)

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

  const { data: activityFeed = [] } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => fetch('/api/wms/dashboard/activity').then((r) => r.json()),
    refetchInterval: 30000,
  })

  const { data: dailySales = [] } = useQuery({
    queryKey: ['daily-sales', chartDays],
    queryFn: () =>
      fetch(`/api/wms/dashboard/daily-sales?days=${chartDays}`).then((r) => r.json()),
  })

  const { data: salesComparison } = useQuery({
    queryKey: ['sales-comparison', chartDays],
    queryFn: () =>
      fetch(`/api/wms/dashboard/sales-comparison?days=${chartDays}`).then((r) => r.json()),
  })

  const { data: topSellers = [] } = useQuery({
    queryKey: ['dashboard-top-sellers'],
    queryFn: () =>
      fetch('/api/wms/reportes/top-vendidos?limit=5').then((r) => r.json()),
  })

  const { data: kpiTrends } = useQuery({
    queryKey: ['kpi-trends'],
    queryFn: () => fetch('/api/wms/dashboard/kpi-trends').then((r) => r.json()),
    refetchInterval: 60000,
  })

  const salesChartData = dailySales

  const topSellersChart = topSellers.slice(0, 5).map((item: any) => ({
    nombre: item.producto?.nombre?.substring(0, 20) ?? 'N/A',
    cantidad: item.cantidadVendida,
  }))

  const quickActions = [
    { id: 'receiving', icon: Download, color: 'emerald', label: 'Nueva Recepción', desc: 'Registrar entrada de mercancía' },
    { id: 'sales', icon: ShoppingCart, color: 'primary', label: 'Nueva Venta', desc: 'Registrar venta a técnico' },
    { id: 'products', icon: Package, color: 'amber', label: 'Agregar Producto', desc: 'Dar de alta un nuevo repuesto' },
    { id: 'reports', icon: BarChart3, color: 'purple', label: 'Ver Reportes', desc: 'Reportes operativos y KPIs' },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl shimmer" />
          <Skeleton className="h-72 rounded-xl shimmer" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards Section */}
      <div className="dot-pattern -mx-6 -mt-2 px-6 py-6 rounded-xl">
        <h2 className="text-sm font-semibold text-foreground mb-3 gradient-text inline-block">Resumen del Almacén</h2>
        <div className="h-0.5 w-12 bg-primary/30 rounded-full mt-1 -mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            label="Stock Total Valorizado"
            value={formatCurrency(data?.valorTotalStock ?? 0)}
            icon={<DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
            color="emerald"
            subtitle="Valor de todo el inventario"
            trend={kpiTrends?.stockTrend}
          />
          <KpiCard
            label="Bajo Mínimo"
            pulse={(data?.productosBajoStock?.count ?? 0) > 0}
            value={
              <span className="inline-flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                {data?.productosBajoStock?.count ?? 0}
              </span>
            }
            icon={<AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />}
            color="red"
            subtitle="Requieren reabastecimiento"
            onClick={() => setCurrentPage('alerts')}
            valueClassName="text-red-600 dark:text-red-400"
          />
          <KpiCard
            label="Ventas del Mes"
            value={formatCurrency(data?.ventasMes?.total ?? 0)}
            icon={<ShoppingCart className="h-5 w-5 text-primary" />}
            color="primary"
            subtitle={`Hoy: ${formatCurrency(data?.ventasHoy?.total ?? 0)} · Sem: ${formatCurrency(data?.ventasSemana?.total ?? 0)}`}
            trend={kpiTrends?.salesTrend}
          />
          <KpiCard
            label="Movimientos del Día"
            value={data?.movimientosHoy ?? 0}
            icon={<ArrowLeftRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            color="amber"
            subtitle="Entradas y salidas de hoy"
            trend={kpiTrends?.movementsTrend}
          />
          <KpiCard
            label="Total Productos"
            value={data?.totalProductos ?? 0}
            icon={<Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
            color="emerald"
            subtitle="En catálogo activo"
          />
          <KpiCard
            label="Total Clientes"
            value={data?.totalClientes ?? 0}
            icon={<Users className="h-5 w-5 text-primary" />}
            color="primary"
            subtitle="Técnicos registrados"
          />
        </div>
      </div>

      {/* Quick Actions Section */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 gradient-text inline-block">Acciones Rápidas</h2>
        <div className="h-0.5 w-12 bg-primary/30 rounded-full mt-1 -mb-2" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const c = colorMap[action.color] || colorMap.primary
            return (
              <Card
                key={action.id}
                className={cn(
                  'card-hover rounded-xl shadow-sm border border-dashed hover:border-solid cursor-pointer group',
                  c.hoverBg
                )}
                onClick={() => setCurrentPage(action.id as any)}
              >
                <CardContent className="p-5 flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center transition-colors',
                      c.iconBg
                    )}
                  >
                    <action.icon className={cn('h-5 w-5', c.iconColor)} />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-medium">{action.label}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{action.desc}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Charts — with thin left-border color accent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm border-l-2 border-l-emerald-500 bg-gradient-to-br from-emerald-50/30 to-transparent dark:from-emerald-950/10 dark:to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Ventas Últimos {chartDays} Días</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Ingresos por día</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  {([7, 30, 90] as const).map((d) => (
                    <button
                      key={d}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-md transition-all duration-150',
                        chartDays === d
                          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                      onClick={() => setChartDays(d)}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                {salesComparison && salesComparison.changePercent !== undefined && (
                  <span
                    className={cn(
                      'text-[10px] font-medium flex items-center gap-0.5',
                      salesComparison.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
                      salesComparison.trend === 'down' ? 'text-red-600 dark:text-red-400' :
                      'text-muted-foreground'
                    )}
                  >
                    {salesComparison.trend === 'up' ? '↑' : salesComparison.trend === 'down' ? '↓' : '='}{' '}
                    {salesComparison.changePercent > 0 ? '+' : ''}{salesComparison.changePercent}% vs anterior
                  </span>
                )}
              </div>
            </div>
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
                    formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="ventas" fill="oklch(0.55 0.15 160)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm border-l-2 border-l-amber-500 bg-gradient-to-br from-amber-50/30 to-transparent dark:from-amber-950/10 dark:to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Top 5 Productos Vendidos</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Más vendidos del período</p>
              </div>
            </div>
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
                    formatter={(value: number) => [value, 'Cantidad']}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="cantidad" fill="oklch(0.78 0.14 75)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent movements */}
        <Card className="rounded-xl shadow-sm border-l-2 border-l-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Últimos Movimientos</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Actividad reciente del almacén</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="table-container max-h-[calc(100vh-18rem)] overflow-y-auto rounded-lg border">
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
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                      <Inbox className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm font-medium">Sin movimientos registrados</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">Los movimientos aparecerán aquí cuando se registren</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card className="rounded-xl shadow-sm border-l-2 border-l-red-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Alertas de Stock</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Productos bajo mínimo</p>
              </div>
              <Badge
                variant="destructive"
                className="cursor-pointer"
                onClick={() => setCurrentPage('alerts')}
              >
                Ver todas
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="table-container max-h-[calc(100vh-18rem)] overflow-y-auto rounded-lg border">
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
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                      <PackageOpen className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm font-medium">Sin alertas de stock</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">Todos los productos están por encima del mínimo</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card className="rounded-xl shadow-sm border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                Actividad Reciente
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Feed en tiempo real · Actualiza cada 30s</p>
            </div>
            <Badge
              variant="outline"
              className="cursor-pointer"
              onClick={() => setCurrentPage('movements')}
            >
              Ver todo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="max-h-80">
            {activityFeed.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Inbox className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin actividad registrada</p>
              </div>
            ) : (
              <div className="relative space-y-0">
                {activityFeed.map((activity: any, idx: number) => {
                  const tipo = activity.tipoMovimiento?.nombre ?? 'N/A'

                  const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
                    ENTRADA: { icon: <ArrowDownCircle className="h-4 w-4" />, color: 'text-emerald-500' },
                    SALIDA: { icon: <ArrowUpCircle className="h-4 w-4" />, color: 'text-red-500' },
                    AJUSTE: { icon: <SlidersHorizontal className="h-4 w-4" />, color: 'text-amber-500' },
                    TRASLADO: { icon: <RefreshCw className="h-4 w-4" />, color: 'text-gray-500' },
                    DEVOLUCION: { icon: <RotateCcw className="h-4 w-4" />, color: 'text-purple-500' },
                  }
                  const iconInfo = iconMap[tipo] ?? { icon: <ArrowLeftRight className="h-4 w-4" />, color: 'text-gray-500' }

                  const isPositive = tipo === 'ENTRADA' || tipo === 'DEVOLUCION'
                  const qtyLabel = isPositive
                    ? `+${activity.cantidad}`
                    : `-${activity.cantidad}`
                  const qtyColor = isPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'

                  const timeLabel = formatDateTime(activity.fecha)

                  return (
                    <div key={activity.id} className="flex items-start gap-3 py-2.5 group">
                      {/* Timeline line and dot */}
                      <div className="flex flex-col items-center">
                        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center bg-muted/50 group-hover:bg-muted transition-colors shrink-0', iconInfo.color)}>
                          {iconInfo.icon}
                        </div>
                        {idx < activityFeed.length - 1 && (
                          <div className="w-px h-full min-h-[12px] bg-border mt-1" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium truncate">
                            {activity.producto?.nombre?.substring(0, 30)}
                          </p>
                          <span className={cn('text-xs font-mono font-semibold shrink-0', qtyColor)}>
                            {tipo.substring(0, 4)} {qtyLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn('inline-block px-1.5 py-0 rounded text-[10px] font-semibold', tipoMovColors[tipo] ?? 'bg-gray-100 text-gray-800')}>
                            {tipo}
                          </span>
                          {activity.ubicacion && (
                            <span className="text-[10px] text-muted-foreground">
                              {activity.ubicacion.pasillo}-{activity.ubicacion.estante}-{activity.ubicacion.nivel}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {timeLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}