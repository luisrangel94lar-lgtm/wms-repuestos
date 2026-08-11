'use client'

import { useQuery } from '@tanstack/react-query'
import { useWmsStore } from '@/store/wms'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, ShoppingCart, Package } from 'lucide-react'

interface Alerta {
  id: number
  sku: string
  nombre: string
  categoria: string | null
  marca: string | null
  stockMinimo: number
  stockActual: number
  deficiencia: number
}

export function AlertsPage() {
  const { setCurrentPage } = useWmsStore()

  const { data: alertas = [], isLoading } = useQuery<Alerta[]>({
    queryKey: ['alertas'],
    queryFn: () => fetch('/api/wms/alertas').then((r) => r.json()),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h2 className="text-lg font-semibold">Productos Bajo Stock Mínimo</h2>
        <Badge variant="destructive">{alertas.length}</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : alertas.length === 0 ? (
        <Card className="rounded-xl shadow-sm"><CardContent className="py-12 text-center"><AlertTriangle className="h-12 w-12 mx-auto mb-3 text-green-500" /><p className="text-muted-foreground">No hay alertas de stock. Todos los productos están por encima del mínimo.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {alertas.map((a) => {
            const isZero = a.stockActual === 0
            return (
              <Card key={a.id} className={`rounded-xl shadow-sm border-l-4 ${isZero ? 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20' : 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20'}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{a.nombre}</p>
                        <span className="text-xs font-mono text-muted-foreground">{a.sku}</span>
                        {isZero && <Badge variant="destructive" className="text-[10px]">SIN STOCK</Badge>}
                        {!isZero && <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-[10px]">BAJO</Badge>}
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        {a.categoria && <span>Categoría: {a.categoria}</span>}
                        {a.marca && <span>Marca: {a.marca}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Actual</p>
                        <p className={`text-lg font-bold font-mono ${isZero ? 'text-red-600' : 'text-yellow-600'}`}>{a.stockActual}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Mínimo</p>
                        <p className="text-lg font-bold font-mono">{a.stockMinimo}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Faltan</p>
                        <p className="text-lg font-bold font-mono text-destructive">-{a.deficiencia}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { /* placeholder */ }}><ShoppingCart className="h-3 w-3 mr-1" />Ordenar</Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setCurrentPage('products')}><Package className="h-3 w-3 mr-1" />Ver</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
