'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWmsStore } from '@/store/wms'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Key,
  ShieldCheck,
  ShieldX,
  Clock,
  Building2,
  Users,
  Calendar,
  Loader2,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react'

interface LicenseData {
  id: number
  tipo: string
  estado: string
  fechaActivacion: string | null
  fechaVencimiento: string | null
  maxUsuarios: number
  diasPrueba: number
  datosEmpresa: string | null
  notas: string | null
  fechaCreacion: string
}

const TIPO_LABELS: Record<string, string> = {
  trial: 'Prueba',
  mensual: 'Mensual',
  anual: 'Anual',
  vitalicio: 'Vitalicio',
}

const TIPO_COLORS: Record<string, string> = {
  trial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  mensual: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  anual: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  vitalicio: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const ESTADO_COLORS: Record<string, string> = {
  activa: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  vencida: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  revocada: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

const ESTADO_LABELS: Record<string, string> = {
  activa: 'Activa',
  vencida: 'Vencida',
  revocada: 'Revocada',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function LicensePage() {
  const queryClient = useQueryClient()
  const [licenseKey, setLicenseKey] = useState('')

  const { data: license, isLoading } = useQuery({
    queryKey: ['license'],
    queryFn: () => fetch('/api/wms/licencia').then(r => r.json()),
  })

  const { data: userCount = 0 } = useQuery({
    queryKey: ['users-count'],
    queryFn: () => fetch('/api/wms/usuarios?count=1').then(r => r.json()).then((d: any) => d.count ?? 0),
  })

  const activateMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await fetch('/api/wms/licencia/activar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: key }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al activar licencia')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license'] })
      toast.success('Licencia activada correctamente')
      setLicenseKey('')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const lic: LicenseData | null = license ?? null
  const isExpired = lic?.estado === 'vencida'
  const isTrial = lic?.tipo === 'trial'
  const isVitalicio = lic?.tipo === 'vitalicio'

  let daysLeft = 0
  let progressPercent = 0
  if (lic?.fechaVencimiento) {
    const now = new Date()
    const exp = new Date(lic.fechaVencimiento)
    daysLeft = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    // Calculate progress based on trial period
    if (lic.fechaActivacion) {
      const start = new Date(lic.fechaActivacion)
      const totalDays = Math.ceil((exp.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const elapsed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      progressPercent = totalDays > 0 ? Math.min(100, Math.max(0, (elapsed / totalDays) * 100)) : 0
    }
  }

  let companyInfo: { nombre?: string; nit?: string; direccion?: string; telefono?: string } = {}
  if (lic?.datosEmpresa) {
    try {
      companyInfo = JSON.parse(lic.datosEmpresa)
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Licencia</h1>
        <p className="text-sm text-muted-foreground mt-1">Información de licencia y activación del sistema</p>
      </div>

      {/* Expired warning banner */}
      {isExpired && (
        <div className="flex items-start gap-3 rounded-xl border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Licencia vencida</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Contacte al administrador para renovar la licencia del sistema.</p>
          </div>
        </div>
      )}

      {/* Trial info banner */}
      {isTrial && !isExpired && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              Período de prueba — {daysLeft} días restantes
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Active una licencia para continuar usando todas las funcionalidades.
            </p>
          </div>
        </div>
      )}

      {/* License info card */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {lic?.estado === 'activa' ? (
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            ) : (
              <ShieldX className="h-4 w-4 text-red-600" />
            )}
            Información de Licencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {lic ? (
            <>
              {/* Type and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <Badge variant="secondary" className={`text-xs font-medium ${TIPO_COLORS[lic.tipo] || ''}`}>
                    {TIPO_LABELS[lic.tipo] || lic.tipo}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge variant="secondary" className={`text-xs font-medium ${ESTADO_COLORS[lic.estado] || ''}`}>
                    {ESTADO_LABELS[lic.estado] || lic.estado}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Activación
                  </p>
                  <p className="text-sm font-medium">{formatDate(lic.fechaActivacion)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Vencimiento
                  </p>
                  <p className="text-sm font-medium">{isVitalicio ? 'Nunca' : formatDate(lic.fechaVencimiento)}</p>
                </div>
              </div>

              <Separator />

              {/* Days remaining - big number */}
              {!isVitalicio && (
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground mb-2">Días restantes</p>
                  <div className="relative">
                    <p className={`text-5xl font-bold tabular-nums ${
                      daysLeft <= 7 ? 'text-red-600 dark:text-red-400' :
                      daysLeft <= 30 ? 'text-amber-600 dark:text-amber-400' :
                      'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {isExpired ? 0 : daysLeft}
                    </p>
                  </div>
                  <Progress
                    value={isExpired ? 100 : progressPercent}
                    className={`mt-3 h-2 ${
                      isExpired ? '[&>div]:bg-red-500' :
                      daysLeft <= 7 ? '[&>div]:bg-amber-500' :
                      '[&>div]:bg-emerald-500'
                    }`}
                  />
                </div>
              )}

              {isVitalicio && (
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground mb-2">Estado de licencia</p>
                  <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-lg font-bold">Licencia Permanente</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Max users */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Usuarios
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {userCount} <span className="text-muted-foreground font-normal">/</span> {lic.maxUsuarios} máximo
                </p>
              </div>

              {/* Company info */}
              {companyInfo.nombre && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> Empresa
                    </p>
                    <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                      <p className="text-sm font-medium">{companyInfo.nombre}</p>
                      {companyInfo.nit && <p className="text-xs text-muted-foreground">NIT: {companyInfo.nit}</p>}
                      {companyInfo.direccion && <p className="text-xs text-muted-foreground">{companyInfo.direccion}</p>}
                      {companyInfo.telefono && <p className="text-xs text-muted-foreground">{companyInfo.telefono}</p>}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldX className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay licencia activa</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activation form */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Activar Licencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Ingrese su clave de licencia para activar el sistema.
          </p>
          <div className="flex gap-3">
            <Input
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="font-mono"
            />
            <Button
              onClick={() => {
                if (!licenseKey.trim()) {
                  toast.error('Ingrese una clave de licencia')
                  return
                }
                activateMutation.mutate(licenseKey.trim())
              }}
              disabled={activateMutation.isPending}
              className="shrink-0"
            >
              {activateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4 mr-1" />
              )}
              Activar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
