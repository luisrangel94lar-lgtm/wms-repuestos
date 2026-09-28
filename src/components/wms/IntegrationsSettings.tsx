'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CreditCard, ExternalLink, Printer, RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { connectQz, getQzPrinterSettings, listQzPrinters, openQzCashDrawer, saveQzPrinterSettings, testQzPrinter, type QzPrinterSettings } from './lib/qz-printer'

export function IntegrationsSettings() {
  const [sandbox, setSandbox] = useState(true)
  const [publicKey, setPublicKey] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [integritySecret, setIntegritySecret] = useState('')
  const [eventsSecret, setEventsSecret] = useState('')
  const [printers, setPrinters] = useState<string[]>([])
  const [printer, setPrinter] = useState<QzPrinterSettings>({ printerName: '', autoPrint: false, openDrawer: false })
  const [qzBusy, setQzBusy] = useState(false)

  useEffect(() => setPrinter(getQzPrinterSettings()), [])

  const wompi = useQuery({
    queryKey: ['wompi-settings'],
    queryFn: async () => {
      const response = await fetch('/api/wms/integraciones/wompi')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo consultar Wompi')
      setSandbox(data.sandbox)
      setPublicKey(data.publicKey)
      return data
    },
    retry: false,
  })

  const saveWompi = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/wms/integraciones/wompi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandbox, publicKey, privateKey, integritySecret, eventsSecret }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar Wompi')
      return data
    },
    onSuccess: () => {
      toast.success('Wompi quedó configurado para esta empresa')
      setPrivateKey(''); setIntegritySecret(''); setEventsSecret('')
      wompi.refetch()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  async function loadPrinters() {
    setQzBusy(true)
    try {
      await connectQz()
      const found = await listQzPrinters()
      setPrinters(found)
      toast.success(`${found.length} impresora(s) detectada(s)`)
    } catch {
      toast.error('No se pudo conectar con QZ Tray. Instálelo y déjelo abierto.')
    } finally {
      setQzBusy(false)
    }
  }

  function updatePrinter(next: QzPrinterSettings) {
    setPrinter(next)
    saveQzPrinterSettings(next)
  }

  return (
    <>
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Pagos con Wompi</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Las credenciales son exclusivas de esta empresa. El inventario se descuenta únicamente después de que Wompi confirme el pago.</p>
          {wompi.error && <p className="text-xs text-destructive">{(wompi.error as Error).message}</p>}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><Label>Ambiente de pruebas</Label><p className="text-[11px] text-muted-foreground">Desactívelo solo al cargar llaves de producción.</p></div>
            <Switch checked={sandbox} onCheckedChange={setSandbox} />
          </div>
          <div className="space-y-1.5"><Label>Llave pública</Label><Input value={publicKey} onChange={e => setPublicKey(e.target.value)} placeholder={sandbox ? 'pub_test_...' : 'pub_prod_...'} /></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5"><Label>Llave privada</Label><Input type="password" value={privateKey} onChange={e => setPrivateKey(e.target.value)} placeholder={wompi.data?.hasPrivateKey ? 'Guardada; deje vacío para conservar' : 'prv_...'} /></div>
            <div className="space-y-1.5"><Label>Secreto de integridad</Label><Input type="password" value={integritySecret} onChange={e => setIntegritySecret(e.target.value)} placeholder={wompi.data?.hasIntegritySecret ? 'Guardado; deje vacío para conservar' : '...integrity...'} /></div>
            <div className="space-y-1.5"><Label>Secreto de eventos</Label><Input type="password" value={eventsSecret} onChange={e => setEventsSecret(e.target.value)} placeholder={wompi.data?.hasEventsSecret ? 'Guardado; deje vacío para conservar' : '...events...'} /></div>
          </div>
          {wompi.data?.webhookUrl && <div className="rounded-lg bg-muted p-3 text-xs"><strong>URL de eventos en Wompi:</strong><div className="mt-1 break-all font-mono">{wompi.data.webhookUrl}</div></div>}
          <Button onClick={() => saveWompi.mutate()} disabled={saveWompi.isPending || wompi.isLoading}><Save className="mr-1 h-4 w-4" />{saveWompi.isPending ? 'Guardando...' : 'Guardar Wompi'}</Button>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Printer className="h-4 w-4" /> Impresora térmica y caja (QZ Tray)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Esta selección se guarda en cada caja o computador. QZ Tray debe estar instalado y abierto en el equipo del cajero.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadPrinters} disabled={qzBusy}><RefreshCw className="mr-1 h-4 w-4" />{qzBusy ? 'Conectando...' : 'Detectar impresoras'}</Button>
            <Button variant="link" asChild><a href="https://qz.io/download/" target="_blank" rel="noreferrer">Descargar QZ Tray <ExternalLink className="ml-1 h-3 w-3" /></a></Button>
          </div>
          <div className="space-y-1.5"><Label>Impresora ESC/POS de 80 mm</Label><Select value={printer.printerName} onValueChange={printerName => updatePrinter({ ...printer, printerName })}><SelectTrigger><SelectValue placeholder="Detecte y seleccione una impresora" /></SelectTrigger><SelectContent>{printers.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-3"><div><Label>Imprimir automáticamente</Label><p className="text-[11px] text-muted-foreground">Al confirmar una venta.</p></div><Switch checked={printer.autoPrint} onCheckedChange={autoPrint => updatePrinter({ ...printer, autoPrint })} /></div>
            <div className="flex items-center justify-between rounded-lg border p-3"><div><Label>Abrir cajón</Label><p className="text-[11px] text-muted-foreground">Envía pulso al imprimir.</p></div><Switch checked={printer.openDrawer} onCheckedChange={openDrawer => updatePrinter({ ...printer, openDrawer })} /></div>
          </div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!printer.printerName} onClick={() => testQzPrinter(printer.printerName).then(() => toast.success('Prueba enviada')).catch(() => toast.error('No se pudo imprimir'))}>Imprimir prueba</Button><Button variant="outline" disabled={!printer.printerName} onClick={() => openQzCashDrawer(printer.printerName).then(() => toast.success('Pulso enviado')).catch(() => toast.error('No se pudo abrir la caja'))}>Abrir caja</Button></div>
          <p className="text-[11px] text-muted-foreground">La primera impresión puede pedir confirmación de QZ Tray. Para impresión silenciosa se requiere un certificado de firma de QZ, que nunca debe guardarse en el navegador.</p>
        </CardContent>
      </Card>
    </>
  )
}
