'use client'

import { t } from '@/lib/hooks/useTranslations'
import { Vehicle } from '@/types'
import { CSSProperties } from 'react'
import { Lock, User } from 'lucide-react'
import {
  SEMANTIC_COLORS, getVehicleSemanticStatus, getStatusLabelKey, getFuelSemanticStatus
} from '@/lib/statusColor'
import Badge from '@/components/ui/Badge'
import Meter from '@/components/ui/Meter'
import { getVehicleImage } from '@/lib/vehicleImage'

interface VehicleMiniCardProps {
  vehicle: Vehicle
  currentLang: string
  onClick: () => void
}

export default function VehicleMiniCard({ vehicle, currentLang, onClick }: VehicleMiniCardProps) {
  const semantic = getVehicleSemanticStatus(vehicle)
  const fuelSemantic = getFuelSemanticStatus(vehicle.fuel)
  const statusLabel = t(getStatusLabelKey(vehicle), currentLang)

  const styles: { [key: string]: CSSProperties } = {
    card: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      width: '100%',
      padding: 'var(--space-3)',
      textAlign: 'left',
      cursor: 'pointer',
      // A faixa lateral repete a informacao do badge por cor. Mantida porque
      // permite varrer a grade inteira sem ler texto; o badge garante que
      // quem nao distingue cor tenha a mesma informacao.
      borderLeft: `4px solid ${SEMANTIC_COLORS[semantic]}`,
      opacity: vehicle.blocked ? 0.72 : 1,
    },
    image: {
      width: 40,
      height: 40,
      borderRadius: 'var(--radius-s)',
      objectFit: 'cover',
      backgroundColor: 'var(--bg-inset)',
      filter: vehicle.blocked ? 'grayscale(100%)' : 'none',
      flexShrink: 0,
    },
    tag: {
      margin: 0,
      fontWeight: 750,
      color: 'var(--text-primary)',
      fontSize: '0.98rem',
      letterSpacing: '-0.015em',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    model: {
      margin: 0,
      color: 'var(--text-secondary)',
      fontSize: '0.75rem',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="surface-interactive"
      style={styles.card}
      aria-label={`${vehicle.tag}, ${vehicle.model}, ${statusLabel}. Abrir detalhes`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- export estatico com images.unoptimized; next/image nao agrega aqui */}
        <img src={getVehicleImage(vehicle.model)} alt="" style={styles.image} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={styles.tag}>{vehicle.tag}</p>
          <p style={styles.model}>{vehicle.model}</p>
        </div>
        {vehicle.blocked && <Lock size={14} style={{ color: 'var(--state-danger)', flexShrink: 0 }} />}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <Badge tone={semantic} variant="soft" size="sm">{statusLabel}</Badge>
      </div>

      {/* O condutor so aparece quando existe: um "Motorista: —" fixo em toda
          a grade e ruido puro, e o card ficaria mais alto sem informar nada. */}
      {vehicle.driver && (
        <p
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            margin: 0,
            fontSize: '0.73rem',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <User size={12} style={{ flexShrink: 0 }} />
          {vehicle.driver}
        </p>
      )}

      <div style={{ marginTop: 'auto' }}>
        <Meter
          value={vehicle.fuel}
          tone={fuelSemantic}
          size="sm"
          ariaLabel={`Combustível ${vehicle.tag}`}
        />
      </div>
    </button>
  )
}
