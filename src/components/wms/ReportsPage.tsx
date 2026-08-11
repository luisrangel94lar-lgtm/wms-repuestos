'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3 } from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { formatCurrency, formatDate } from './lib/format'

const CHART_COLORS = ['#171717', '#404040', '#737373', '#a3a3a3', '#d4d4d4', '#e5e5e5']

export function ReportsPage() {
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [diasMuertos, setDiasMuertos] = useState('60')

  const queryParams = new URLSearchParams()
  if (fechaDesde) queryParams.set('fechaDesde', fechaDesde)
  if (fechaHasta) queryParams.set('fechaHasta', fechaHasta)
  const queryStr = queryParams.toString()

  // Inventory value data
  const { data: allProducts = [] } = useQuery({
    queryKey: ['report-products', refreshKey],
    queryFn: () => fetch('/api/wms/productos?pageSize=500').then((r) => r.json()).then((d: any) => d.items ?? []),
  })

  const { data: stockEntries = [] } = useQuery({
    queryKey: ['report-stock', refreshKey],
    queryFn: () => fetch('/api/wms/stock').then((r) => r.json()),
  })

  // Group value by category
  const categoryData = (() => {
    const map = new Map<string, number>()
    allProducts.forEach((p: any) => {
      const cat = p.categoria?.nombre ?? 'Sin categoría'
      const stocks = stockEntries.filter((s: any) => s.idProducto === p.id)
      const total = stocks.reduce((sum: number, s: any) => sum + s.cantidad, 0)
      const value = total * p.costoUnitario
      map.set(cat, (map.get(cat) ?? 0) + value)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  })()

  // Inventory table
  const inventoryTable = allProducts.map((p: any) => {
    const stocks = stockEntries.filter((s: any) => s.idProducto === p.id)
    const totalStock = stocks.reduce((sum: number, s: any) => sum + s.cantidad, 0)
    return { ...p, totalStock, valorTotal: totalStock * p.costoUnitario }
  }).sort((a: any, b: any) => b.valorTotal - a.valorTotal)

  // Dead stock
  const { data: deadStock = [] } = useQuery({
    queryKey: ['report-dead-stock', diasMuertos, refreshKey],
    queryFn: () => fetch(`/api/wms/reportes/inventario-muerto?dias=${diasMuertos}`).then((r) => r.json()),
  })

  // Top sellers
  const { data: topSellers = [] } = useQuery({
    queryKey: ['report-top-sellers', queryStr, refreshKey],
    queryFn: () => fetch(`/api/wms/reportes/top-vendidos?${queryStr || 'limit=10'}`).then((r) => r.json()),
  })

  // Sales by client
  const { data: clientSales = [] } = useQuery({
    queryKey: ['report-client-sales', queryStr, refreshKey],
    queryFn: () => fetch(`/api/wms/reportes/ventas-por-cliente?${queryStr}`).then((r) => r.json()),
  })

  // Equipment demand
  const { data: equipmentDemand = [] } = useQuery({
    queryKey: ['report-equipment-demand', queryStr, refreshKey],
    queryFn: () => fetch(`/api/wms/reportes/demanda-por-equipo?${queryStr}`).then((r) => r.json()),
  })

  // Rotation
  const { data: rotation = [] } = useQuery({
    queryKey: ['report-rotation', refreshKey],
    queryFn: () => fetch('/api/wms/reportes/rotacion').then((r) => r.json()),
  })

  function handleGenerate() { setRefreshKey((k) => k + 1) }

  return (
    <div className="space-y-4">
      {/* Date range filter */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Fecha Desde</Label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha Hasta</Label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
            <Button onClick={handleGenerate}>
              <BarChart3 className="h-4 w-4 mr-1" /> Generar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="inventario-valorizado">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1 rounded-lg">
          <TabsTrigger value="inventario-valorizado" className="text-xs">Inventario Valorizado</TabsTrigger>
          <TabsTrigger value="inventario-muerto" className="text-xs">Inventario Muerto</TabsTrigger>
          <TabsTrigger value="top-vendidos" className="text-xs">Top Vendidos</TabsTrigger>
          <TabsTrigger value="ventas-cliente" className="text-xs">Ventas por Cliente</TabsTrigger>
          <TabsTrigger value="demanda-equipo" className="text-xs">Demanda por Equipo</TabsTrigger>
          <TabsTrigger value="rotacion" className="text-xs">Rotación</TabsTrigger>
        </TabsList>

        {/* Tab 1: Inventario Valorizado */}
        <TabsContent value="inventario-valorizado" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Por Categoría</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Por Producto (Top 20)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead className="text-xs">Producto</TableHead><TableHead className="text-xs text-center">Stock</TableHead><TableHead className="text-xs text-right">Valor</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {inventoryTable.slice(0, 20).map((p: any) => (
                      <TableRow key={p.id}><TableCell className="text-xs py-1.5 max-w-[180px] truncate">{p.nombre}</TableCell><TableCell className="text-xs text-center font-mono py-1.5">{p.totalStock}</TableCell><TableCell className="text-xs text-right py-1.5">{formatCurrency(p.valorTotal)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Inventario Muerto */}
        <TabsContent value="inventario-muerto" className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm">Días sin movimiento:</Label>
            <Input type="number" className="w-24" value={diasMuertos} onChange={(e) => setDiasMuertos(e.target.value)} />
          </div>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead className="text-xs">Producto</TableHead><TableHead className="text-xs">SKU</TableHead><TableHead className="text-xs text-center">Stock</TableHead><TableHead className="text-xs text-center">Días sin Mov.</TableHead><TableHead className="text-xs">Último Mov.</TableHead></TableRow></TableHeader>
                <TableBody>
                  {deadStock.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin inventario muerto</TableCell></TableRow>}
                  {deadStock.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-medium py-2 max-w-[200px] truncate">{item.nombre}</TableCell>
                      <TableCell className="text-xs font-mono py-2">{item.sku}</TableCell>
                      <TableCell className="text-xs text-center font-mono py-2">{item.totalStock}</TableCell>
                      <TableCell className="text-xs text-center py-2"><Badge variant="destructive" className="text-[10px]">{item.daysSinceLastMovement ?? 'N/A'}</Badge></TableCell>
                      <TableCell className="text-xs py-2 text-muted-foreground">{item.lastMovementDate ? formatDate(item.lastMovementDate) : 'Nunca'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Top Vendidos */}
        <TabsContent value="top-vendidos" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Gráfico</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSellers.slice(0, 10).map((t: any) => ({ nombre: t.producto?.nombre?.substring(0, 20) ?? 'N/A', cantidad: t.cantidadVendida }))} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={140} />
                      <Tooltip />
                      <Bar dataKey="cantidad" fill="var(--foreground)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Tabla</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead className="text-xs">Producto</TableHead><TableHead className="text-xs text-center">Cantidad</TableHead><TableHead className="text-xs text-right">Valor Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {topSellers.map((t: any, i: number) => (
                      <TableRow key={i}><TableCell className="text-xs py-1.5">{t.producto?.nombre}</TableCell><TableCell className="text-xs text-center font-mono py-1.5">{t.cantidadVendida}</TableCell><TableCell className="text-xs text-right py-1.5">{formatCurrency(t.valorTotal)}</TableCell></TableRow>
                    ))}
                    {topSellers.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Sin datos</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: Ventas por Cliente */}
        <TabsContent value="ventas-cliente">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead className="text-xs">Cliente</TableHead><TableHead className="text-xs text-center">Ventas</TableHead><TableHead className="text-xs text-center">Productos</TableHead><TableHead className="text-xs text-right">Valor Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {clientSales.map((cs: any, i: number) => (
                    <TableRow key={i} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-medium py-2">{cs.cliente?.nombre}</TableCell>
                      <TableCell className="text-xs text-center font-mono py-2">{cs.totalVentas}</TableCell>
                      <TableCell className="text-xs text-center font-mono py-2">{cs.totalProductos}</TableCell>
                      <TableCell className="text-xs text-right py-2">{formatCurrency(cs.totalValor)}</TableCell>
                    </TableRow>
                  ))}
                  {clientSales.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin datos</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Demanda por Equipo */}
        <TabsContent value="demanda-equipo">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead className="text-xs">Equipo</TableHead><TableHead className="text-xs">Marca</TableHead><TableHead className="text-xs">Tipo</TableHead><TableHead className="text-xs text-center">Repuestos</TableHead><TableHead className="text-xs text-center">Demanda Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {equipmentDemand.map((ed: any, i: number) => (
                    <TableRow key={i} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-medium py-2">{ed.equipo?.modelo}</TableCell>
                      <TableCell className="text-xs py-2">{ed.equipo?.marca?.nombre}</TableCell>
                      <TableCell className="text-xs py-2">{ed.equipo?.tipoEquipo ?? '-'}</TableCell>
                      <TableCell className="text-xs text-center font-mono py-2">{ed.productos?.length ?? 0}</TableCell>
                      <TableCell className="text-xs text-center font-mono py-2">{ed.cantidadTotal}</TableCell>
                    </TableRow>
                  ))}
                  {equipmentDemand.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin datos</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Rotación */}
        <TabsContent value="rotacion">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead className="text-xs">Producto</TableHead><TableHead className="text-xs hidden md:table-cell">Categoría</TableHead><TableHead className="text-xs text-center">Vendido</TableHead><TableHead className="text-xs text-center">Stock Actual</TableHead><TableHead className="text-xs text-center">Rotación</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rotation.map((r: any, i: number) => (
                    <TableRow key={i} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-medium py-2 max-w-[200px] truncate">{r.producto?.nombre}</TableCell>
                      <TableCell className="text-xs py-2 hidden md:table-cell">{r.producto?.categoria ?? '-'}</TableCell>
                      <TableCell className="text-xs text-center font-mono py-2">{r.totalVendido}</TableCell>
                      <TableCell className="text-xs text-center font-mono py-2">{r.stockActual}</TableCell>
                      <TableCell className="text-xs text-center py-2">
                        <Badge variant={r.rotacionRate >= 1 ? 'default' : 'outline'} className="text-[10px] font-mono">
                          {r.rotacionRate.toFixed(2)}x
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rotation.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin datos</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
