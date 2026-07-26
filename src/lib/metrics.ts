import { Vehicle, HistoryItem } from '@/types'
import { parseDateTime } from '@/lib/helpers'

export interface UsageRankingItem {
  id: string | number
  label: string
  sublabel: string
  withdrawalsCount: number
  totalKm: number
  activeHours: number
}

export interface PeakUsageTime {
  hourLabel: string
  hourNumber: number
  count: number
}

export interface PeakUsageDay {
  dayName: string
  count: number
}

export interface VehicleIdleMetric {
  vehicleId: number
  tag: string
  plate: string
  model: string
  status: string
  idleHours: number
  workshopHours: number
  daysSinceWash: number
  lastWashedFormatted: string
  statusSinceFormatted: string
}

export interface ObservationLog {
  id: string
  date: string
  vehicleTag: string
  vehiclePlate: string
  author: string
  action: string
  observation: string
}

export function calculateUsageRanking(
  history: HistoryItem[],
  vehicles: Vehicle[],
  period: 'day' | 'week' | 'month' | 'year'
): UsageRankingItem[] {
  const now = new Date()
  const threshold = new Date()

  if (period === 'day') {
    threshold.setHours(0, 0, 0, 0)
  } else if (period === 'week') {
    threshold.setDate(now.getDate() - 7)
  } else if (period === 'month') {
    threshold.setMonth(now.getMonth() - 1)
  } else if (period === 'year') {
    threshold.setFullYear(now.getFullYear() - 1)
  }

  const map: Record<string, { withdrawals: number; km: number; activeMinutes: number; vehicle: Vehicle | null }> = {}

  vehicles.forEach(v => {
    map[v.tag] = { withdrawals: 0, km: 0, activeMinutes: 0, vehicle: v }
  })

  history.forEach(item => {
    const itemDate = parseDateTime(item.date)
    if (isNaN(itemDate.getTime()) || itemDate < threshold) return

    const match = item.vehicle.match(/^(TN-\d+)/i)
    const tag = match ? match[1].toUpperCase() : item.vehicle

    if (!map[tag]) {
      map[tag] = { withdrawals: 0, km: 0, activeMinutes: 0, vehicle: null }
    }

    if (item.action === 'Retirada') {
      map[tag].withdrawals += 1
    }

    if (item.distanceKm) {
      map[tag].km += item.distanceKm
    }

    if (item.travelTimeMinutes) {
      map[tag].activeMinutes += item.travelTimeMinutes
    }
  })

  return Object.entries(map)
    .map(([tag, data]) => ({
      id: tag,
      label: tag,
      sublabel: data.vehicle ? `${data.vehicle.model} (${data.vehicle.plate})` : 'Veículo Infratech',
      withdrawalsCount: data.withdrawals,
      totalKm: Math.round(data.km),
      activeHours: Math.round((data.activeMinutes / 60) * 10) / 10
    }))
    .sort((a, b) => b.withdrawalsCount - a.withdrawalsCount || b.totalKm - a.totalKm)
}

export function calculateVehicleTimeMetrics(vehicles: Vehicle[]): VehicleIdleMetric[] {
  const now = new Date()

  return vehicles.map(v => {
    const statusDate = v.lastStatusChangeAt ? new Date(v.lastStatusChangeAt) : new Date(now.getTime() - 48 * 3600 * 1000)
    const washedDate = v.lastWashedAt ? new Date(v.lastWashedAt) : new Date(now.getTime() - 120 * 3600 * 1000)

    const diffHours = Math.max(0, Math.round((now.getTime() - statusDate.getTime()) / (1000 * 3600)))
    const washedDiffDays = Math.max(0, Math.round((now.getTime() - washedDate.getTime()) / (1000 * 3600 * 24)))

    let idleHours = 0
    let workshopHours = 0

    if (v.status === 'disp') {
      idleHours = diffHours
    } else if (v.status === 'man') {
      workshopHours = diffHours
    }

    return {
      vehicleId: v.id,
      tag: v.tag,
      plate: v.plate,
      model: v.model,
      status: v.status,
      idleHours,
      workshopHours,
      daysSinceWash: washedDiffDays,
      lastWashedFormatted: washedDate.toLocaleDateString('pt-BR'),
      statusSinceFormatted: statusDate.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    }
  })
}

export function calculatePeakUsage(history: HistoryItem[]): { hours: PeakUsageTime[]; days: PeakUsageDay[] } {
  const hourCounts: Record<number, number> = {}
  for (let h = 0; h < 24; h++) hourCounts[h] = 0

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const dayCounts: Record<string, number> = {}
  dayNames.forEach(d => dayCounts[d] = 0)

  history.forEach(item => {
    if (item.action === 'Retirada') {
      const dt = parseDateTime(item.date)
      if (!isNaN(dt.getTime())) {
        hourCounts[dt.getHours()] = (hourCounts[dt.getHours()] || 0) + 1
        const dName = dayNames[dt.getDay()]
        dayCounts[dName] = (dayCounts[dName] || 0) + 1
      }
    }
  })

  const hours: PeakUsageTime[] = Object.entries(hourCounts).map(([h, count]) => ({
    hourNumber: Number(h),
    hourLabel: `${String(h).padStart(2, '0')}:00`,
    count
  }))

  const days: PeakUsageDay[] = dayNames.map(dName => ({
    dayName: dName,
    count: dayCounts[dName] || 0
  }))

  return { hours, days }
}

export function calculateKmRanking(history: HistoryItem[], vehicles: Vehicle[]): { vehicles: { tag: string; model: string; km: number }[]; drivers: { name: string; km: number }[] } {
  const vehicleKm: Record<string, number> = {}
  const driverKm: Record<string, number> = {}

  vehicles.forEach(v => {
    vehicleKm[v.tag] = v.km
  })

  history.forEach(item => {
    if (item.driver && item.distanceKm) {
      driverKm[item.driver] = (driverKm[item.driver] || 0) + item.distanceKm
    }
  })

  const vehicleList = Object.entries(vehicleKm)
    .map(([tag, km]) => {
      const v = vehicles.find(item => item.tag === tag)
      return { tag, model: v?.model || 'Veículo', km }
    })
    .sort((a, b) => b.km - a.km)

  const driverList = Object.entries(driverKm)
    .map(([name, km]) => ({ name, km: Math.round(km) }))
    .sort((a, b) => b.km - a.km)

  return { vehicles: vehicleList, drivers: driverList }
}

export function extractObservationsTimeline(history: HistoryItem[], vehicles: Vehicle[]): ObservationLog[] {
  const logs: ObservationLog[] = []

  vehicles.forEach(v => {
    if (v.obs && v.obs.trim()) {
      logs.push({
        id: `v-obs-${v.id}`,
        date: 'Observação Atual do Ativo',
        vehicleTag: v.tag,
        vehiclePlate: v.plate,
        author: v.driver || 'Ativo/Cadastro',
        action: 'Cadastro / Status',
        observation: v.obs
      })
    }
  })

  history.forEach((h, idx) => {
    if (h.extra && h.extra.trim() && h.extra !== '-') {
      const match = h.vehicle.match(/^(TN-\d+)/i)
      const tag = match ? match[1].toUpperCase() : h.vehicle
      logs.push({
        id: `h-obs-${idx}`,
        date: h.date,
        vehicleTag: tag,
        vehiclePlate: h.vehicle.includes('(') ? h.vehicle.split('(')[1].replace(')', '') : '',
        author: h.driver || 'Sistema/Operador',
        action: h.action,
        observation: h.extra
      })
    }
  })

  return logs
}

export function generateGrafanaMetrics(vehicles: Vehicle[], history: HistoryItem[]) {
  const total = vehicles.length
  const disp = vehicles.filter(v => v.status === 'disp').length
  const uso = vehicles.filter(v => v.status === 'uso').length
  const man = vehicles.filter(v => v.status === 'man').length
  const lav = vehicles.filter(v => v.status === 'lav').length
  const mobilizacao = vehicles.filter(v => v.status === 'mobilizacao').length
  const blocked = vehicles.filter(v => v.blocked).length

  const prometheusText = `
# HELP infratech_vehicles_total Total de veículos cadastrados na frota
# TYPE infratech_vehicles_total gauge
infratech_vehicles_total ${total}

# HELP infratech_vehicles_status_count Total de veículos por status operacional
# TYPE infratech_vehicles_status_count gauge
infratech_vehicles_status_count{status="disponivel"} ${disp}
infratech_vehicles_status_count{status="em_uso"} ${uso}
infratech_vehicles_status_count{status="manutencao"} ${man}
infratech_vehicles_status_count{status="lavador"} ${lav}
infratech_vehicles_status_count{status="mobilizacao"} ${mobilizacao}
infratech_vehicles_status_count{status="bloqueado"} ${blocked}

# HELP infratech_vehicle_odometer_km Hodômetro atual do veículo
# TYPE infratech_vehicle_odometer_km gauge
${vehicles.map(v => `infratech_vehicle_odometer_km{tag="${v.tag}",plate="${v.plate}",model="${v.model.replace(/\s+/g, '_')}"} ${v.km}`).join('\n')}

# HELP infratech_history_total_events Total de eventos de movimentação no histórico
# TYPE infratech_history_total_events counter
infratech_history_total_events ${history.length}
`.trim()

  return {
    summary: { total, disp, uso, man, lav, mobilizacao, blocked, historyEvents: history.length },
    prometheus: prometheusText
  }
}
