'use client'

import { t } from '@/lib/hooks/useTranslations'
import { FilterType, Vehicle } from '@/types'
import { CSSProperties } from 'react'
import VehicleCard from '@/components/vehicles/VehicleCard'
import { AlertTriangle, Ban } from 'lucide-react'

interface DashboardPageProps {
  vehicles: Vehicle[]
  currentFilter: FilterType
  currentLang: string
  isAdmin: boolean
  onFilterChange: (filter: FilterType) => void
  onWithdraw: (vehicle: Vehicle) => void
  onReturn: (vehicle: Vehicle) => void
  onService: (type: 'man' | 'lav', vehicle: Vehicle) => void
  onManage: (vehicle: Vehicle) => void
}

export default function DashboardPage({
  vehicles,
  currentFilter,
  currentLang,
  isAdmin,
  onFilterChange,
  onWithdraw,
  onReturn,
  onService,
  onManage
}: DashboardPageProps) {
  const styles: { [key: string]: CSSProperties } = {
    container_padding: {
      padding: '25px',
      maxWidth: '1400px',
      margin: '0 auto',
    },
    filterBar: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginBottom: '25px',
    },
    filterPill: {
      backgroundColor: 'var(--bg-card)',
      padding: '8px 16px',
      borderRadius: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      cursor: 'pointer',
      border: '2px solid transparent',
      fontSize: '0.9rem',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    },
    vehiclesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '20px',
    },
  }

  const getTagNumber = (tag: string) => {
    const match = tag.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }
  const sortedVehicles = [...vehicles].sort((a, b) => getTagNumber(a.tag) - getTagNumber(b.tag))

  const filteredVehicles = currentFilter === 'all'
    ? sortedVehicles
    : sortedVehicles.filter(v => v.status === currentFilter)

  const counts = {
    all: vehicles.length,
    disp: vehicles.filter(v => v.status === 'disp').length,
    uso: vehicles.filter(v => v.status === 'uso').length,
    lav: vehicles.filter(v => v.status === 'lav').length,
    man: vehicles.filter(v => v.status === 'man').length,
    mobilizacao: vehicles.filter(v => v.status === 'mobilizacao').length,
    blocked: vehicles.filter(v => v.blocked).length,
  }

  const maintenanceAlerts = vehicles.filter(v => {
    const remaining = v.maintenance - v.km
    return remaining >= 0 && remaining <= 1000
  })

  const blockedAlerts = vehicles.filter(v => v.blocked)

  const filterOptions: FilterType[] = ['all', 'disp', 'uso', 'lav', 'man']

  return (
    <div style={styles.container_padding}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '10px', color: 'var(--text-primary)' }}>{t('dashboardTitle', currentLang)}</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>{t('dashboardSubtitle', currentLang)}</p>

      {/* Maintenance Alert Banner */}
      {maintenanceAlerts.length > 0 && (
        <div style={{ backgroundColor: 'var(--alert-bg)', color: 'var(--alert-text)', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '5px solid #e74c3c', fontWeight: 600 }}>
          <AlertTriangle size={18} />
          <span>{t('maintenanceAlert', currentLang)}</span>
        </div>
      )}

      {/* Blocked Alert Banner */}
      {blockedAlerts.length > 0 && (
        <div style={{ backgroundColor: 'rgba(255, 20, 147, 0.15)', color: '#ff1493', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '5px solid #ff1493', fontWeight: 600 }}>
          <Ban size={18} />
          <span>{blockedAlerts.length} {currentLang === 'pt' ? 'veículo(s) bloqueado(s)' : currentLang === 'en' ? 'vehicle(s) blocked' : 'vehículo(s) bloqueado(s)'}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        {filterOptions.map(filter => {
          const color = filter === 'all' ? '#34495e' : filter === 'disp' ? '#27ae60' : filter === 'uso' ? '#3498db' : filter === 'lav' ? '#f39c12' : '#e74c3c'
          return (
            <div
              key={filter}
              onClick={() => onFilterChange(filter)}
              style={{
                ...styles.filterPill,
                borderColor: currentFilter === filter ? color : 'transparent',
                color: currentFilter === filter ? color : 'var(--text-secondary)',
              }}
            >
              {t(filter === 'all' ? 'statAll' : filter === 'disp' ? 'statAvailable' : filter === 'uso' ? 'statInUse' : filter === 'lav' ? 'statWash' : 'statMaintenance', currentLang)} ({counts[filter as keyof typeof counts]})
            </div>
          )
        })}
      </div>

      {/* Vehicles Grid */}
      <div style={styles.vehiclesGrid}>
        {filteredVehicles.map(vehicle => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            currentLang={currentLang}
            isAdmin={isAdmin}
            onWithdraw={onWithdraw}
            onReturn={onReturn}
            onService={onService}
            onManage={onManage}
          />
        ))}
      </div>
    </div>
  )
}