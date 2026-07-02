export interface GeoPoint {
  lat: number
  lng: number
}

const CAPTURE_TIMEOUT_MS = 4000

// Captura pontual de localizacao (nao rastreamento continuo). Nunca lanca
// erro e nunca trava quem chamou: se nao houver suporte, permissao negada,
// ou a captura demorar demais, resolve null e o fluxo segue normalmente
// sem esse dado.
export function captureLocation(): Promise<GeoPoint | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: CAPTURE_TIMEOUT_MS, maximumAge: 60000 }
    )
  })
}
