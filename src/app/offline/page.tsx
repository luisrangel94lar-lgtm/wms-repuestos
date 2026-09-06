import Link from 'next/link'
import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <main className="min-h-screen grid place-items-center bg-background p-6 text-foreground">
      <section className="max-w-md text-center space-y-4">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-muted">
          <WifiOff className="size-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold">Sin conexión</h1>
        <p className="text-muted-foreground">
          El WMS necesita conexión para consultar y actualizar el inventario de forma segura.
        </p>
        <Link className="inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground" href="/">
          Reintentar
        </Link>
      </section>
    </main>
  )
}
