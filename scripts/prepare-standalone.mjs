import { cp, mkdir } from 'node:fs/promises'

await mkdir('.next/standalone/.next', { recursive: true })
await cp('.next/static', '.next/standalone/.next/static', { recursive: true, force: true })
await cp('public', '.next/standalone/public', { recursive: true, force: true })
await mkdir('.next/standalone/public/downloads', { recursive: true })
await cp('release/android/WMS-Repuestos.apk', '.next/standalone/public/downloads/WMS-Repuestos.apk', { force: true })
