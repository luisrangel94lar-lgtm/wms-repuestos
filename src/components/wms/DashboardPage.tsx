'use client'

import { useState } from 'react'
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

function KpiCard({
  label,
  value,
  icon,
  color,
  subtitle,
  onClick,
  valueClassName,
}: {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  color: string
  subtitle?: string
  onClick?: () => void
  valueClassName?: string
}) {
  const c = colorMap[color] || colorMap.primary
  return (
    <Card
      onClick={onClick}
      className={cn(
        'rounded-xl shadow-sm border-t-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]',
        c.border,
        c.gradient,
        onClick && 'cursor-pointer'
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className={cn('text-2xl font-bold tracking-tight animate-count-up', valueClassName)}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
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

  const { data: dailySales = [] } = useQuery({
    queryKey: ['daily-sales', chartDays],
    queryFn: () =>
      fetch(`/api/wms/dashboard/daily-sales?days=${chartDays}`).then((r) => r.json()),
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
      {/* KPI Cards Section */}
      <div className="dot-pattern -mx-6 -mt-2 px-6 py-6 rounded-xl">
        <h2 className="text-sm font-semibold text-foreground mb-3">Resumen del Almacén</h2>
        <div className="h-0.5 w-12 bg-primary/30 rounded-full mt-1 -mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            label="Stock Total Valorizado"
            value={formatCurrency(data?.valorTotalStock ?? 0)}
            icon={<DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
            color="emerald"
            subtitle="Valor de todo el inventario"
          />
          <KpiCard
            label="Bajo Mínimo"
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
          />
          <KpiCard
            label="Movimientos del Día"
            value={data?.movimientosHoy ?? 0}
            icon={<ArrowLeftRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            color="amber"
            subtitle="Entradas y salidas de hoy"
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
        <h2 className="text-sm font-semibold text-foreground mb-3">Acciones Rápidas</h2>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm border bg-gradient-to-br from-emerald-50/30 to-transparent dark:from-emerald-950/10 dark:to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Ventas Últimos {chartDays} Días</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Ingresos por día</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-md transition-colors',
                    chartDays === 7
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                  onClick={() => setChartDays(7)}
                >
                  7 días
                </button>
                <button
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-md transition-colors',
                    chartDays === 30
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                  onClick={() => setChartDays(30)}
                >
                  30 días
                </button>
                <button
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-md transition-colors',
                    chartDays === 90
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                  onClick={() => setChartDays(90)}
                >
                  90 días
                </button>
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

        <Card className="rounded-xl shadow-sm border bg-gradient-to-br from-amber-50/30 to-transparent dark:from-amber-950/10 dark:to-transparent">
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
        <Card className="rounded-xl shadow-sm border">
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
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">
                      Sin movimientos registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card className="rounded-xl shadow-sm border">
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
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">
                      Sin alertas de stock
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}