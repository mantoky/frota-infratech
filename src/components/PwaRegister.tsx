'use client'

import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const onControllerChange = () => {
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        // Força checagem de nova versão ao abrir o PWA instalado
        registration.update().catch(() => {})
        setInterval(() => {
          registration.update().catch(() => {})
        }, 60_000)
      })
      .catch((e) => {
        console.error('Falha ao registrar service worker', e)
      })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  return null
}
