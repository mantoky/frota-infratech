'use client'

import { t } from '@/lib/hooks/useTranslations'
import { FilterType, Vehicle } from '@/types'
import { CSSProperties } from 'react'
import VehicleCard from '@/components/vehicles/VehicleCard'

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
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    statCard: {
      backgroundColor: 'var(--bg-card)',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      transition: 'transform 0.3s',
      border: '3px solid transparent',
      borderTop: '5px solid',
    },
    vehiclesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '20px',
    },
  }

  const filteredVehicles = currentFilter === 'all'
    ? vehicles
    : vehicles.filter(v => v.status === currentFilter)

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

  const filterOptions: FilterType[] = ['all', 'disp', 'uso', 'lav', 'man']

  return (
    <div style={styles.container_padding}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '10px', color: 'var(--text-primary)' }}>{t('dashboardTitle', currentLang)}</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>{t('dashboardSubtitle', currentLang)}</p>

      {/* Maintenance Alert Banner */}
      {maintenanceAlerts.length > 0 && (
        <div style={{ backgroundColor: 'var(--alert-bg)', color: 'var(--alert-text)', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '5px solid #e74c3c', fontWeight: 600 }}>
          <i className="fas fa-exclamation-triangle"></i>
          <span>{t('maintenanceAlert', currentLang)}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        {filterOptions.map(filter => (
          <div
            key={filter}
            onClick={() => onFilterChange(filter)}
            style={{
              ...styles.statCard,
              borderColor: currentFilter === filter ? '#009688' : 'transparent',
              transform: currentFilter === filter ? 'scale(1.05)' : 'none',
              borderTopColor: filter === 'all' ? '#34495e' : filter === 'disp' ? '#27ae60' : filter === 'uso' ? '#3498db' : filter === 'lav' ? '#f39c12' : '#e74c3c',
            }}
          >
            <h3 style={{ fontSize: '2rem', marginBottom: '5px', color: filter === 'all' ? '#34495e' : filter === 'disp' ? '#27ae60' : filter === 'uso' ? '#3498db' : filter === 'lav' ? '#f39c12' : '#e74c3c' }}>
              {counts[filter as keyof typeof counts]}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
              {t(filter === 'all' ? 'statAll' : filter === 'disp' ? 'statAvailable' : filter === 'uso' ? 'statInUse' : filter === 'lav' ? 'statWash' : 'statMaintenance', currentLang)}
            </p>
          </div>
        ))}
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