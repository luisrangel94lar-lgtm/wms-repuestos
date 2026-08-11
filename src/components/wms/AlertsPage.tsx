'use client'

import { useQuery } from '@tanstack/react-query'
import { useWmsStore } from '@/store/wms'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, ShoppingCart, Package, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const { setCurrentPage, setReceivingProductId } = useWmsStore()

  const { data: alertas = [], isLoading } = useQuery<Alerta[]>({
    queryKey: ['alertas'],
    queryFn: () => fetch('/api/wms/alertas').then((r) => r.json()),
  })

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Productos que requieren reabastecimiento urgente</p>
      </div>

      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h2 className="text-lg font-semibold">Productos Bajo Stock Mínimo</h2>
        <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
          {alertas.length}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : alertas.length === 0 ? (
        <Card className="rounded-xl shadow-sm"><CardContent className="py-12 text-center"><AlertTriangle className="h-12 w-12 mx-auto mb-3 text-emerald-500" /><p className="text-muted-foreground">No hay alertas de stock. Todos los productos están por encima del mínimo.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {alertas.map((a) => {
            const isZero = a.stockActual === 0
            const fillPercent = a.stockMinimo > 0 ? Math.round((a.stockActual / a.stockMinimo) * 100) : 0
            return (
              <Card
                key={a.id}
                className={cn(
                  'rounded-xl shadow-sm border overflow-hidden hover:shadow-md hover:-translate-y-px transition-all duration-200',
                  isZero
                    ? 'border-red-300 dark:border-red-800'
                    : 'border-amber-300 dark:border-amber-800'
                )}
              >
                <div className={cn(
                  'h-1 w-full',
                  isZero ? 'bg-red-500' : 'bg-amber-500'
                )} />
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{a.nombre}</p>
                        <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{a.sku}</span>
                      </div>
                      <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        {a.categoria && <span>Categoría: <span className="text-foreground">{a.categoria}</span></span>}
                        {a.marca && <span>Marca: <span className="text-foreground">{a.marca}</span></span>}
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                          <span>Stock actual vs mínimo</span>
                          <span className="font-mono">{a.stockActual} / {a.stockMinimo}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              isZero ? 'bg-red-500' : fillPercent < 50 ? 'bg-amber-500' : 'bg-yellow-400'
                            )}
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex gap-4">
                        <div className="text-center">
                          <p className="text-[11px] text-muted-foreground">Actual</p>
                          <p className={cn(
                            'text-xl font-bold font-mono leading-tight',
                            isZero ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                          )}>{a.stockActual}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] text-muted-foreground">Mínimo</p>
                          <p className="text-xl font-bold font-mono leading-tight">{a.stockMinimo}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] text-muted-foreground">Faltan</p>
                          <p className="text-xl font-bold font-mono leading-tight text-destructive">-{a.deficiencia}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1"
                          onClick={() => { setCurrentPage('receiving'); setReceivingProductId(a.id) }}
                        >
                          <Zap className="h-3 w-3" /> Pedido rápido
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs gap-1"
                          onClick={() => setCurrentPage('products')}
                        >
                          <Package className="h-3 w-3" /> Ver producto
                        </Button>
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
