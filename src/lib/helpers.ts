import { HistoryItem } from '@/types'

export const generateVehicleId = (): number => Date.now()

export const isValidAdminPin = (pin: string): boolean => {
  const validPins = [
    process.env.NEXT_PUBLIC_ADMIN_PIN_1,
    process.env.NEXT_PUBLIC_ADMIN_PIN_2,
    process.env.NEXT_PUBLIC_ADMIN_PIN_3
  ].filter(Boolean)
  return validPins.includes(pin)
}

export const getFuelPercent = (text: string): number => {
  const map: { [key: string]: number } = {
    'Reserva': 10,
    '1/4': 25,
    '2/4': 50,
    '3/4': 75,
    'Cheio': 100
  }
  return map[text] || 50
}

export const parseDate = (dateStr: string): Date => {
  const [datePart] = dateStr.split(' ')
  const [day, month, year] = datePart.split('/')
  return new Date(`${year}-${month}-${day}`)
}

// Igual ao parseDate, mas preserva a hora - necessario pra calcular tempo de
// viagem entre retirada e devolucao no mesmo dia (parseDate zera a hora).
export const parseDateTime = (dateStr: string): Date => {
  const [datePart, timePart] = dateStr.split(' ')
  const [day, month, year] = datePart.split('/')
  return new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}`)
}

export const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// Encontra a retirada mais recente deste veiculo no historico - usado pra
// parear com uma devolucao e calcular distancia/tempo de viagem. Assume a
// mesma regra ja usada por calculateDriverKm: retirada e devolucao sempre
// alternam por veiculo, sem duas retiradas seguidas sem devolucao no meio.
export const findLastWithdrawal = (vehicleLabel: string, history: HistoryItem[]): HistoryItem | undefined => {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].vehicle === vehicleLabel && history[i].action === 'Retirada') return history[i]
  }
  return undefined
}

export const getVehicleImage = (model: string): string => {
  const modelLower = model.toLowerCase()
  if (modelLower.includes('hilux')) {
    return '/vehicles/hilux.png'
  } else if (modelLower.includes('nivus')) {
    return '/vehicles/nivus.png'
  } else if (modelLower.includes('s10')) {
    return '/vehicles/s10.png'
  } else if (modelLower.includes('ranger')) {
    return '/vehicles/ranger.png'
  }
  return '/vehicles/generic.png'
}

export const calculateDriverKm = (driverName: string, history: HistoryItem[]): number => {
  // Find all withdrawals by this driver from the full history
  const withdrawals = history.filter(h => h.driver === driverName && h.action === 'Retirada')
  let totalKm = 0
  
  withdrawals.forEach(withdrawal => {
    // Find the corresponding return for this vehicle after the withdrawal date
    // Returns have empty driver, so search in full history
    const withdrawalDate = parseDate(withdrawal.date)
    
    const returnEvent = history.find(h => 
      h.action === 'Devolucao' && 
      h.vehicle === withdrawal.vehicle &&
      parseDate(h.date) > withdrawalDate &&
      h.driver === '' // Returns have empty driver
    )
    
    if (returnEvent) {
      // KM driven = return KM - withdrawal KM
      totalKm += Math.max(0, returnEvent.km - withdrawal.km)
    }
    // If no return found, vehicle is still in use - don't add anything
  })
  
  return totalKm
}

export const getDriverKmDetails = (driverName: string, history: HistoryItem[]) => {
  const withdrawals = history.filter(h => h.driver === driverName && h.action === 'Retirada')
  const details: { date: string; vehicle: string; kmStart: number; kmEnd: number; kmDriven: number }[] = []
  
  withdrawals.forEach(withdrawal => {
    const withdrawalDate = parseDate(withdrawal.date)
    const returnEvent = history.find(h => 
      h.action === 'Devolucao' && 
      h.vehicle === withdrawal.vehicle &&
      parseDate(h.date) > withdrawalDate &&
      h.driver === '' // Returns have empty driver
    )
    
    if (returnEvent) {
      details.push({
        date: withdrawal.date.split(' ')[0],
        vehicle: withdrawal.vehicle,
        kmStart: withdrawal.km,
        kmEnd: returnEvent.km,
        kmDriven: Math.max(0, returnEvent.km - withdrawal.km)
      })
    }
  })
  
  return details
}

export const getDriverStats = (history: HistoryItem[]) => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const driverStats: { [key: string]: number } = {}
  history.forEach(h => {
    const hDate = new Date(h.date.split(' ')[0].split('/').reverse().join('-'))
    if (hDate >= thirtyDaysAgo && h.driver && h.action === 'Retirada') {
      driverStats[h.driver] = (driverStats[h.driver] || 0) + 1
    }
  })

  return Object.entries(driverStats).sort((a, b) => b[1] - a[1])
}
