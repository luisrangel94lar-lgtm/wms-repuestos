'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { stableSubscribe } from '@/lib/settings-store'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

export function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const mounted = useSyncExternalStore(stableSubscribe, () => true, () => false)

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
      toast.success('La aplicación quedó instalada.')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (installed || (mounted && isStandalone())) return null

  async function handleInstall() {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null)
      }
      return
    }

    const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isAppleMobile) {
      toast.info('En iPhone o iPad: toca Compartir y luego “Agregar a pantalla de inicio”.', { duration: 7000 })
    } else {
      toast.info('En Chrome o Edge: abre el menú del navegador y selecciona “Instalar WMS Repuestos”.', { duration: 7000 })
    }
  }

  return (
    <div className="mx-4 mt-3 md:mx-6 flex flex-col gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2.5">
        <Smartphone className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Usar WMS como aplicación</p>
          <p className="text-xs text-muted-foreground">Instálala en este equipo para abrirla desde el escritorio o la pantalla de inicio.</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        <Button type="button" size="sm" className="gap-2" onClick={handleInstall}>
          <Smartphone className="h-4 w-4" />
          Instalar aplicación
        </Button>
        <Button asChild type="button" size="sm" variant="outline" className="gap-2">
          <a href="/downloads/WMS-Repuestos.apk" download>
            <Download className="h-4 w-4" />
            Descargar APK
          </a>
        </Button>
      </div>
    </div>
  )
}
