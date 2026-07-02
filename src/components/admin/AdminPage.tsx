'use client'

import { useState, CSSProperties } from 'react'
import { t } from '@/lib/hooks/useTranslations'
import { Vehicle } from '@/types'
import { SEMANTIC_COLORS, getVehicleSemanticStatus } from '@/lib/statusColor'
import { Search, Pencil, Plus, X, UserPlus } from 'lucide-react'

interface AdminPageProps {
  vehicles: Vehicle[]
  drivers: string[]
  currentLang: string
  onManage: (vehicle: Vehicle) => void
  onAddVehicle: () => void
  onSaveDrivers: (drivers: string[]) => void
}

const statusLabelKey = (vehicle: Vehicle): string => {
  if (vehicle.blocked) return 'vehicleBlocked'
  if (vehicle.status === 'disp') return 'statusAvailable'
  if (vehicle.status === 'uso') return 'statusInUse'
  if (vehicle.status === 'lav') return 'statusWash'
  if (vehicle.status === 'man') return 'statusMaintenance'
  if (vehicle.status === 'mobilizacao') return 'statusMobilization'
  return 'statusAvailable'
}

export default function AdminPage({
  vehicles,
  drivers,
  currentLang,
  onManage,
  onAddVehicle,
  onSaveDrivers
}: AdminPageProps) {
  const [search, setSearch] = useState('')
  const [newDriver, setNewDriver] = useState('')

  const styles: { [key: string]: CSSProperties } = {
    container: {
      padding: '25px',
      maxWidth: '1400px',
      margin: '0 auto',
    },
    card: {
      backgroundColor: 'var(--bg-card)',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      marginBottom: '25px',
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
      backgroundColor: 'var(--bg-main)',
      color: 'var(--text-primary)',
      fontSize: '0.95rem',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: '0.9rem',
    },
    th: {
      textAlign: 'left' as const,
      padding: '10px 12px',
      color: 'var(--text-secondary)',
      fontSize: '0.75rem',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      borderBottom: '2px solid var(--border)',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '10px 12px',
      borderBottom: '1px solid var(--border)',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
    },
    badge: {
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '0.7rem',
      fontWeight: 700,
      color: '#fff',
    },
    editButton: {
      padding: '6px 12px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: 'var(--brand-gray)',
      color: 'white',
      cursor: 'pointer',
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
    },
    driverRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      borderBottom: '1px solid var(--border)',
    },
    removeDriverButton: {
      padding: '4px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: SEMANTIC_COLORS.anormal,
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addDriverInput: {
      flex: 1,
      padding: '10px 12px',
      borderRadius: '8px',
      border: '2px solid var(--border)',
      backgroundColor: 'var(--bg-main)',
      color: 'var(--text-primary)',
      fontSize: '0.9rem',
    },
    addDriverButton: {
      padding: '10px 16px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'var(--brand-primary)',
      color: 'white',
      cursor: 'pointer',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
  }

  const getTagNumber = (tag: string) => {
    const match = tag.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  const query = search.trim().toLowerCase()
  const filteredVehicles = [...vehicles]
    .sort((a, b) => getTagNumber(a.tag) - getTagNumber(b.tag))
    .filter(v => {
      if (!query) return true
      return v.tag.toLowerCase().includes(query) ||
        v.plate.toLowerCase().includes(query) ||
        v.model.toLowerCase().includes(query) ||
        (v.driver || '').toLowerCase().includes(query)
    })

  const handleAddDriver = () => {
    const name = newDriver.trim()
    if (!name || drivers.includes(name)) return
    onSaveDrivers([...drivers, name])
    setNewDriver('')
  }

  const handleRemoveDriver = (name: string) => {
    onSaveDrivers(drivers.filter(d => d !== name))
  }

  return (
    <div style={styles.container}>
      <h1 className="page-title">{t('adminTitle', currentLang)}</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>{t('adminSubtitle', currentLang)}</p>

      {/* Vehicles management */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '15px' }}>
          <h3 style={{ color: 'var(--text-primary)' }}>{t('adminVehiclesTitle', currentLang)}</h3>
          <button onClick={onAddVehicle} style={{ ...styles.addDriverButton, backgroundColor: 'var(--brand-secondary)' }}>
            <Plus size={16} /> {t('btnAdd', currentLang)}
          </button>
        </div>

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

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{t('lblTag', currentLang)}</th>
                <th style={styles.th}>{t('lblPlate', currentLang)}</th>
                <th style={styles.th}>{t('lblModel', currentLang)}</th>
                <th style={styles.th}>{t('lblStatus', currentLang)}</th>
                <th style={styles.th}>{t('lblMileage', currentLang)}</th>
                <th style={styles.th}>{t('lblNextMaintLabel', currentLang)}</th>
                <th style={styles.th}>{t('lblDriverLabel', currentLang)}</th>
                <th style={styles.th}>{t('lblLastLocation', currentLang)}</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map(vehicle => {
                const semantic = getVehicleSemanticStatus(vehicle)
                return (
                  <tr key={vehicle.id}>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{vehicle.tag}</td>
                    <td style={styles.td}>{vehicle.plate}</td>
                    <td style={styles.td}>{vehicle.model}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, backgroundColor: SEMANTIC_COLORS[semantic] }}>
                        {t(statusLabelKey(vehicle), currentLang)}
                      </span>
                    </td>
                    <td style={styles.td}>{vehicle.km.toLocaleString()} km</td>
                    <td style={styles.td}>{vehicle.maintenance ? vehicle.maintenance.toLocaleString() + ' km' : '-'}</td>
                    <td style={styles.td}>{vehicle.driver || t('none', currentLang)}</td>
                    <td style={styles.td}>{vehicle.lastLocation || '-'}</td>
                    <td style={styles.td}>
                      <button onClick={() => onManage(vehicle)} style={styles.editButton}>
                        <Pencil size={14} /> {t('btnEdit', currentLang)}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drivers management */}
      <div style={styles.card}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '5px' }}>{t('adminDriversTitle', currentLang)}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>{t('adminDriversDesc', currentLang)}</p>

        {drivers.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '15px 0' }}>{t('adminNoDrivers', currentLang)}</p>
        ) : (
          <div style={{ marginBottom: '15px' }}>
            {drivers.map(name => (
              <div key={name} style={styles.driverRow}>
                <span>{name}</span>
                <button onClick={() => handleRemoveDriver(name)} style={styles.removeDriverButton} aria-label={t('btnRemove', currentLang)}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={newDriver}
            onChange={(e) => setNewDriver(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddDriver()}
            placeholder={t('adminAddDriverPlaceholder', currentLang)}
            style={styles.addDriverInput}
          />
          <button onClick={handleAddDriver} style={styles.addDriverButton}>
            <UserPlus size={16} /> {t('btnAddDriver', currentLang)}
          </button>
        </div>
      </div>
    </div>
  )
}
