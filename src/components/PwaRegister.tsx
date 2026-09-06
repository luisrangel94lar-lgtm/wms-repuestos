'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('No fue posible registrar el service worker:', error)
      })
    }
  }, [])

  return null
}
