import { HistoryItem } from '@/types'

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

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    disp: '#27ae60',
    uso: '#3498db',
    lav: '#f39c12',
    man: '#e74c3c',
    mobilizacao: '#9b59b6'
  }
  return colors[status] || '#95a5a6'
}

export const getStatusBg = (status: string): string => {
  const colors: Record<string, string> = {
    disp: 'rgba(39, 174, 96, 0.2)',
    uso: 'rgba(52, 152, 219, 0.2)',
    lav: 'rgba(243, 156, 18, 0.2)',
    man: 'rgba(231, 76, 60, 0.2)',
    mobilizacao: 'rgba(155, 89, 182, 0.2)'
  }
  return colors[status] || 'rgba(149, 165, 166, 0.2)'
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
