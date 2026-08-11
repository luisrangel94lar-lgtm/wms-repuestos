'use client'

import { useSyncExternalStore, useCallback, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Save, Building2, Globe, Palette, Info, Download, Upload, Database, AlertTriangle } from 'lucide-react'

const STORAGE_KEY = 'wms-settings'
const SETTINGS_EVENT = 'wms-settings-changed'

interface WmsSettings {
  warehouseName: string
  warehouseAddress: string
  warehousePhone: string
  moneda: string
  tema: string
  idioma: string
}

const DEFAULT_SETTINGS: WmsSettings = {
  warehouseName: 'Almacén de Repuestos',
  warehouseAddress: '',
  warehousePhone: '',
  moneda: 'MXN',
  tema: 'Claro',
  idioma: 'Español',
}

function subscribe(callback: () => void) {
  window.addEventListener(SETTINGS_EVENT, callback)
  return () => window.removeEventListener(SETTINGS_EVENT, callback)
}

function getSnapshot(): WmsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_SETTINGS
}

function getServerSnapshot(): WmsSettings {
  return DEFAULT_SETTINGS
}

export function SettingsPage() {
  const { setTheme } = useTheme()
  const queryClient = useQueryClient()
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [exporting, setExporting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateSetting = useCallback(<K extends keyof WmsSettings>(key: K, value: WmsSettings[K]) => {
    const current = getSnapshot()
    const next = { ...current, [key]: value }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(SETTINGS_EVENT))

    // Integrate with next-themes for theme
    if (key === 'tema') {
      setTheme(value === 'Oscuro' ? 'dark' : 'light')
    }
  }, [setTheme])

  function handleSave() {
    toast.success('Configuración guardada correctamente')
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/wms/settings/backup')
      if (!res.ok) {
        toast.error('Error al exportar datos')
        return
      }
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wms-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Respaldo descargado correctamente')
    } catch {
      toast.error('Error de conexión')
    } finally {
      setExporting(false)
    }
  }

  async function handleRestore() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      toast.error('Seleccione un archivo')
      return
    }
    setRestoring(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const res = await fetch('/api/wms/settings/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Error al restaurar')
        return
      }
      const result = await res.json()
      const imp = result.imported
      toast.success(`Datos restaurados: ${imp.products} productos, ${imp.equipment} equipos, ${imp.locations} ubicaciones, ${imp.clients} clientes, ${imp.stock} stock`)
      queryClient.invalidateQueries()
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      toast.error('Error al procesar archivo')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Personalizar el sistema según tus necesidades</p>
      </div>

      {/* Datos del Almacén */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Datos del Almacén
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre del Almacén</Label>
            <Input
              value={settings.warehouseName}
              onChange={(e) => updateSetting('warehouseName', e.target.value)}
              placeholder="Nombre del almacén"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Dirección</Label>
            <Input
              value={settings.warehouseAddress}
              onChange={(e) => updateSetting('warehouseAddress', e.target.value)}
              placeholder="Dirección del almacén"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Teléfono</Label>
            <Input
              value={settings.warehousePhone}
              onChange={(e) => updateSetting('warehousePhone', e.target.value)}
              placeholder="Teléfono de contacto"
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferencias */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Preferencias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Globe className="h-3 w-3" /> Moneda
              </Label>
              <Select value={settings.moneda} onValueChange={(v) => updateSetting('moneda', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MXN">MXN (Peso Mexicano)</SelectItem>
                  <SelectItem value="USD">USD (Dólar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tema</Label>
              <Select value={settings.tema} onValueChange={(v) => updateSetting('tema', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Claro">Claro</SelectItem>
                  <SelectItem value="Oscuro">Oscuro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Idioma</Label>
              <Select value={settings.idioma} onValueChange={(v) => updateSetting('idioma', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Español">Español</SelectItem>
                  <SelectItem value="Inglés">Inglés</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Respaldo de Datos */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Respaldo de Datos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Exporta o importa los datos maestros del sistema (productos, equipos, ubicaciones, clientes y stock).</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border p-3">
                <Download className="h-4 w-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Exportar Datos</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Descarga todos los datos maestros como archivo JSON.</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleExport}
                disabled={exporting}
              >
                <Download className="h-4 w-4 mr-1" />
                {exporting ? 'Exportando...' : 'Descargar Respaldo'}
              </Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border p-3">
                <Upload className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Importar Datos</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Restaura datos desde un archivo de respaldo JSON previo.</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={restoring}
              >
                <Upload className="h-4 w-4 mr-1" />
                Seleccionar Archivo
              </Button>
              {fileInputRef.current?.files?.[0] && (
                <Button
                  className="w-full"
                  onClick={handleRestore}
                  disabled={restoring}
                >
                  {restoring ? 'Restaurando...' : 'Restaurar Datos'}
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-[11px] text-amber-800 dark:text-amber-200">Los registros que ya existan (mismo SKU, modelo o nombre) se omitirán durante la importación. No se eliminarán datos existentes.</p>
          </div>
        </CardContent>
      </Card>

      {/* Acerca de */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Acerca de
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Versión</span>
            <span className="text-sm font-mono">1.0.0</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sistema</span>
            <span className="text-sm">WMS Repuestos</span>
          </div>
          <Separator />
          <div>
            <span className="text-sm text-muted-foreground block mb-2">Stack Tecnológico</span>
            <div className="flex flex-wrap gap-1.5">
              {['Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS 4', 'shadcn/ui', 'Prisma', 'SQLite', 'TanStack Query', 'Zustand', 'Recharts', 'Sonner'].map((tech) => (
                <span key={tech} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full sm:w-auto">
        <Save className="h-4 w-4 mr-1" /> Guardar Configuración
      </Button>
    </div>
  )
}
