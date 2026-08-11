'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Buscar productos, equipos...' },
  { keys: ['Ctrl', '1'], description: 'Ir a Dashboard' },
  { keys: ['Ctrl', '2'], description: 'Ir a Productos' },
  { keys: ['Ctrl', '3'], description: 'Ir a Equipos' },
  { keys: ['Ctrl', '4'], description: 'Ir a Recepción' },
  { keys: ['Ctrl', '5'], description: 'Ir a Ventas' },
  { keys: ['Ctrl', '6'], description: 'Ir a Inventario' },
  { keys: ['Ctrl', '7'], description: 'Ir a Movimientos' },
  { keys: ['Ctrl', '8'], description: 'Ir a Reportes' },
  { keys: ['Ctrl', '9'], description: 'Ir a Alertas' },
  { keys: ['Esc'], description: 'Cerrar diálogos' },
  { keys: ['?'], description: 'Mostrar atajos de teclado' },
]

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atajos de Teclado</DialogTitle>
          <DialogDescription>Usa estos atajos para navegar más rápido</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 py-2">
          {shortcuts.map((shortcut, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, kIdx) => (
                  <span key={kIdx}>
                    {kIdx > 0 && <span className="text-xs text-muted-foreground mx-0.5">+</span>}
                    <kbd className="inline-flex items-center justify-center h-7 min-w-7 px-2 rounded-md border border-border bg-muted text-xs font-mono font-medium shadow-sm">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
