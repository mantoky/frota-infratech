export interface Vehicle {
  id: number
  tag: string
  plate: string
  model: string
  status: 'disp' | 'uso' | 'lav' | 'man' | 'mobilizacao'
  km: number
  fuel: number
  fuelText: string
  maintenance: number
  driver: string
  lastLocation: string
  obs: string
  blocked?: boolean
  blockedReason?: string
  blockedBy?: string
  blockedAt?: string
}

export interface HistoryItem {
  date: string
  vehicle: string
  driver: string
  action: string
  km: number
  extra: string
  location?: { lat: number; lng: number }
  distanceKm?: number
  travelTimeMinutes?: number
}

export interface Translations {
  [key: string]: {
    [lang: string]: string
  }
}

export type ModalType = 'withdraw' | 'return' | 'service' | 'manage' | 'add' | 'pin'
export type FilterType = 'all' | 'disp' | 'uso' | 'lav' | 'man'
export type PageType = 'dashboard' | 'drivers' | 'settings' | 'admin'