'use client'

import { t } from '@/lib/hooks/useTranslations'
import { Vehicle } from '@/types'
import { CSSProperties } from 'react'
import { SEMANTIC_COLORS, getVehicleSemanticStatus, getStatusLabelKey } from '@/lib/statusColor'

interface VehicleMiniCardProps {
  vehicle: Vehicle
  currentLang: string
  onClick: () => void
}

const getVehicleImage = (model: string): string => {
  const modelLower = model.toLowerCase()
  if (modelLower.includes('hilux')) return '/vehicles/hilux.png'
  if (modelLower.includes('nivus')) return '/vehicles/nivus.png'
  if (modelLower.includes('s10')) return '/vehicles/s10.png'
  if (modelLower.includes('ranger')) return '/vehicles/ranger.png'
  return '/vehicles/generic.png'
}

export default function VehicleMiniCard({ vehicle, currentLang, onClick }: VehicleMiniCardProps) {
  const semantic = getVehicleSemanticStatus(vehicle)
  const color = SEMANTIC_COLORS[semantic]
  const fuelSemantic = vehicle.fuel >= 75 ? 'ok' : vehicle.fuel >= 30 ? 'alerta' : 'anormal'

  const styles: { [key: string]: CSSProperties } = {
    card: {
      backgroundColor: 'var(--bg-card)',
      borderRadius: '10px',
      padding: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      borderLeft: `4px solid ${color}`,
      cursor: 'pointer',
      opacity: vehicle.blocked ? 0.6 : 1,
      transition: 'transform 0.15s',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '10px',
    },
    image: {
      width: '36px',
      height: '36px',
      borderRadius: '8px',
      objectFit: 'cover',
      filter: vehicle.blocked ? 'grayscale(100%)' : 'none',
      flexShrink: 0,
    },
    tag: {
      fontWeight: 700,
      color: 'var(--text-primary)',
      fontSize: '0.95rem',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    model: {
      color: 'var(--text-secondary)',
      fontSize: '0.75rem',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    badge: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '0.6rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      backgroundColor: color,
      color: '#fff',
      marginBottom: '8px',
    },
    fuelTrack: {
      backgroundColor: 'var(--border)',
      height: '5px',
      borderRadius: '3px',
      overflow: 'hidden',
    },
  }

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={styles.header}>
        <img src={getVehicleImage(vehicle.model)} alt="" style={styles.image} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={styles.tag}>{vehicle.tag}</p>
          <p style={styles.model}>{vehicle.model}</p>
        </div>
      </div>
      <span style={styles.badge}>{t(getStatusLabelKey(vehicle), currentLang)}</span>
      <div style={styles.fuelTrack}>
        <div style={{ height: '100%', width: `${vehicle.fuel}%`, backgroundColor: SEMANTIC_COLORS[fuelSemantic] }} />
      </div>
    </div>
  )
}
