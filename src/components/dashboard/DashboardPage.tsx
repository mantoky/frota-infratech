'use client'

import { t } from '@/lib/hooks/useTranslations'
import { FilterType, Vehicle } from '@/types'
import { CSSProperties, useState } from 'react'
import VehicleMiniCard from '@/components/vehicles/VehicleMiniCard'
import VehicleDetailModal from '@/components/vehicles/VehicleDetailModal'
import { AlertTriangle, Ban, Search } from 'lucide-react'
import { SEMANTIC_COLORS } from '@/lib/statusColor'

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
  const [search, setSearch] = useState('')
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null)

  const styles: { [key: string]: CSSProperties } = {
    container_padding: {
      padding: '25px',
      maxWidth: '1400px',
      margin: '0 auto',
    },
    searchBar: {
      position: 'relative',
      marginBottom: '20px',
      maxWidth: '420px',
    },
    searchInput: {
      width: '100%',
      padding: '12px 16px 12px 42px',
      borderRadius: '10px',
      border: '2px solid var(--border)',
      backgroundColor: 'var(--bg-card)',
      color: 'var(--text-primary)',
      fontSize: '0.95rem',
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
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: '12px',
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

  const searchQuery = search.trim().toLowerCase()
  const searchedVehicles = searchQuery
    ? filteredVehicles.filter(v =>
        v.tag.toLowerCase().includes(searchQuery) ||
        v.plate.toLowerCase().includes(searchQuery) ||
        v.model.toLowerCase().includes(searchQuery) ||
        (v.driver || '').toLowerCase().includes(searchQuery)
      )
    : filteredVehicles

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
      <h1 className="page-title">{t('dashboardTitle', currentLang)}</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>{t('dashboardSubtitle', currentLang)}</p>

      {/* Maintenance Alert Banner */}
      {maintenanceAlerts.length > 0 && (
        <div style={{ backgroundColor: SEMANTIC_COLORS.alerta, color: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
          <AlertTriangle size={18} />
          <span>{t('maintenanceAlert', currentLang)}</span>
        </div>
      )}

      {/* Blocked Alert Banner */}
      {blockedAlerts.length > 0 && (
        <div style={{ backgroundColor: SEMANTIC_COLORS.anormal, color: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
          <Ban size={18} />
          <span>{blockedAlerts.length} {currentLang === 'pt' ? 'veículo(s) bloqueado(s)' : currentLang === 'en' ? 'vehicle(s) blocked' : 'vehículo(s) bloqueado(s)'}</span>
        </div>
      )}

      {/* Search */}
      <div style={styles.searchBar}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder', currentLang)}
          style={styles.searchInput}
        />
      </div>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        {filterOptions.map(filter => {
          const color = filter === 'all' ? 'var(--text-primary)' : filter === 'disp' ? SEMANTIC_COLORS.ok : filter === 'uso' ? SEMANTIC_COLORS.ok : filter === 'lav' ? SEMANTIC_COLORS.alerta : SEMANTIC_COLORS.anormal
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
        {searchedVehicles.map(vehicle => (
          <VehicleMiniCard
            key={vehicle.id}
            vehicle={vehicle}
            currentLang={currentLang}
            onClick={() => setDetailVehicle(vehicle)}
          />
        ))}
      </div>

      <VehicleDetailModal
        vehicle={detailVehicle}
        isOpen={!!detailVehicle}
        onClose={() => setDetailVehicle(null)}
        currentLang={currentLang}
        isAdmin={isAdmin}
        onWithdraw={onWithdraw}
        onReturn={onReturn}
        onService={onService}
        onManage={onManage}
      />
    </div>
  )
}