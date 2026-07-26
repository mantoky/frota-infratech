'use client'

import { t } from '@/lib/hooks/useTranslations'
import { Vehicle } from '@/types'
import { CSSProperties, ReactNode } from 'react'
import { Ban, Truck, AlertCircle, Key, Wrench, Droplet, Undo2, Lock, Pencil } from 'lucide-react'
import {
  SEMANTIC_COLORS, SEMANTIC_TEXT, getVehicleSemanticStatus, getStatusLabelKey, getFuelSemanticStatus
} from '@/lib/statusColor'
import Badge from '@/components/ui/Badge'
import Meter from '@/components/ui/Meter'
import AlertBanner from '@/components/ui/AlertBanner'
import { getVehicleImage } from '@/lib/vehicleImage'

interface VehicleCardProps {
  vehicle: Vehicle
  currentLang: string
  isAdmin: boolean
  embedded?: boolean
  onWithdraw: (vehicle: Vehicle) => void
  onReturn: (vehicle: Vehicle) => void
  onService: (type: 'man' | 'lav', vehicle: Vehicle) => void
  onManage: (vehicle: Vehicle) => void
}

function DataPoint({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <p
        className="tabular"
        style={{ margin: 0, fontWeight: 650, fontSize: '0.92rem', color: tone || 'var(--text-primary)' }}
      >
        {value}
      </p>
    </div>
  )
}

export default function VehicleCard({
  vehicle,
  currentLang,
  isAdmin,
  embedded,
  onWithdraw,
  onReturn,
  onService,
  onManage
}: VehicleCardProps) {
  const fuelSemantic = getFuelSemanticStatus(vehicle.fuel)
  const remainingKm = vehicle.maintenance - vehicle.km
  const isMaintAlert = remainingKm >= 0 && remainingKm <= 1000
  const isBlocked = Boolean(vehicle.blocked)
  const isMobilization = vehicle.status === 'mobilizacao'
  const semanticStatus = getVehicleSemanticStatus(vehicle)

  const styles: { [key: string]: CSSProperties } = {
    root: {
      display: 'grid',
      gap: 'var(--space-4)',
      backgroundColor: embedded ? 'transparent' : 'var(--bg-card)',
      border: embedded ? 'none' : '1px solid var(--border)',
      borderLeft: embedded ? 'none' : `4px solid ${SEMANTIC_COLORS[semanticStatus]}`,
      borderRadius: embedded ? 0 : 'var(--radius-m)',
      boxShadow: embedded ? 'none' : 'var(--shadow-sm)',
      padding: embedded ? 0 : 'var(--space-5)',
    },
    image: {
      width: 64,
      height: 64,
      borderRadius: 'var(--radius-m)',
      objectFit: 'cover',
      border: '1px solid var(--border)',
      backgroundColor: 'var(--bg-inset)',
      filter: isBlocked ? 'grayscale(100%)' : 'none',
      flexShrink: 0,
    },
    dataGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: 'var(--space-4)',
      padding: 'var(--space-4)',
      borderRadius: 'var(--radius-s)',
      backgroundColor: 'var(--bg-inset)',
      border: '1px solid var(--border-subtle)',
    },
    actions: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 'var(--space-2)',
    },
  }

  const actionsDisabled = isBlocked

  return (
    <div style={styles.root}>
      {isBlocked && (
        <AlertBanner
          tone="anormal"
          icon={<Ban size={17} />}
          title="Veículo bloqueado"
          description={
            vehicle.blockedReason
              ? `${vehicle.blockedReason}${vehicle.blockedBy ? ` · por ${vehicle.blockedBy}` : ''}`
              : undefined
          }
        />
      )}

      {isMobilization && !isBlocked && (
        <AlertBanner
          tone="alerta"
          icon={<Truck size={17} />}
          title="Veículo em processo de mobilização"
          description="Indisponível para retirada até a conclusão."
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- export estatico com images.unoptimized */}
        <img src={getVehicleImage(vehicle.model)} alt="" style={styles.image} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3
            style={{
              margin: 0,
              fontSize: '1.2rem',
              fontWeight: 750,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            {vehicle.tag}
          </h3>
          {/* So o modelo aqui: a placa ja tem lugar proprio na grade de dados
              logo abaixo, e repetir os dois no cabecalho fazia o mesmo numero
              aparecer duas vezes na mesma dobra. */}
          <p style={{ margin: '2px 0 8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {vehicle.model}
          </p>
          <Badge tone={semanticStatus} variant="solid" size="sm">
            {t(getStatusLabelKey(vehicle), currentLang)}
          </Badge>
        </div>
      </div>

      <div style={styles.dataGrid}>
        <DataPoint label={t('lblMileage', currentLang)} value={`${vehicle.km.toLocaleString('pt-BR')} km`} />
        <DataPoint label={t('lblPlateLabel', currentLang)} value={vehicle.plate} />
        <DataPoint
          label={t('lblNextMaintLabel', currentLang)}
          value={vehicle.maintenance ? `${vehicle.maintenance.toLocaleString('pt-BR')} km` : '—'}
          tone={isMaintAlert ? SEMANTIC_TEXT.alerta : undefined}
        />
        <DataPoint label={t('lblDriverLabel', currentLang)} value={vehicle.driver || t('none', currentLang)} />
        {vehicle.lastLocation && (
          <DataPoint label={t('lblLastLocation', currentLang)} value={vehicle.lastLocation} />
        )}
      </div>

      {isMaintAlert && (
        <p
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            margin: 0,
            fontSize: '0.85rem',
            fontWeight: 650,
            color: SEMANTIC_TEXT.alerta,
          }}
        >
          <AlertCircle size={15} />
          {t('maintIn', currentLang)} {remainingKm.toLocaleString('pt-BR')}km
        </p>
      )}

      <Meter
        value={vehicle.fuel}
        tone={fuelSemantic}
        label={t('lblFuelLabel', currentLang)}
        valueLabel={vehicle.fuelText}
        ariaLabel={`Combustível ${vehicle.tag}`}
      />

      {vehicle.obs && (
        <div>
          <span className="field-label">Observações</span>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {vehicle.obs}
          </p>
        </div>
      )}

      <div style={styles.actions}>
        {/* Veiculo bloqueado esconde as acoes de operacao para quem nao e
            admin. Antes o botao aparecia desabilitado, o que so gera
            tentativa repetida em campo sem explicar o motivo. */}
        {(!isBlocked || isAdmin) ? (
          vehicle.status === 'disp' ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => !actionsDisabled && onWithdraw(vehicle)}
                disabled={actionsDisabled}
              >
                <Key size={16} /> {t('btnWithdraw', currentLang)}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => !actionsDisabled && onService('man', vehicle)}
                disabled={actionsDisabled}
              >
                <Wrench size={16} /> {t('btnMaint', currentLang)}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => !actionsDisabled && onService('lav', vehicle)}
                disabled={actionsDisabled}
              >
                <Droplet size={16} /> {t('btnWash', currentLang)}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => !actionsDisabled && onReturn(vehicle)}
              disabled={actionsDisabled}
            >
              <Undo2 size={16} /> {t('btnReturn', currentLang)}
            </button>
          )
        ) : (
          <div
            className="btn"
            aria-disabled="true"
            style={{ backgroundColor: 'var(--state-danger-soft)', color: SEMANTIC_TEXT.anormal, cursor: 'not-allowed' }}
          >
            <Lock size={16} /> Bloqueado
          </div>
        )}

        <button type="button" className="btn btn-ghost" onClick={() => onManage(vehicle)}>
          <Pencil size={16} /> {t('btnEdit', currentLang)}
        </button>
      </div>
    </div>
  )
}
