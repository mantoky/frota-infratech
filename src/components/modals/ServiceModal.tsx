'use client'

import { useState, FormEvent } from 'react'
import { t } from '@/lib/hooks/useTranslations'
import { Vehicle } from '@/types'
import Modal from './Modal'
import { CSSProperties } from 'react'

interface ServiceModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: Vehicle | null
  serviceType: 'man' | 'lav'
  currentLang: string
  onConfirm: (data: {
    driver: string
    km: number
    obs: string
  }) => void
}

export default function ServiceModal({
  isOpen,
  onClose,
  vehicle,
  serviceType,
  currentLang,
  onConfirm
}: ServiceModalProps) {
  const [driver, setDriver] = useState('')
  const [km, setKm] = useState('')
  const [obs, setObs] = useState('')
  const [loadedKey, setLoadedKey] = useState<number | null>(null)

  const openKey = isOpen && vehicle ? vehicle.id : null
  if (openKey !== null && openKey !== loadedKey) {
    setLoadedKey(openKey)
    setKm(vehicle!.km.toString())
  } else if (openKey === null && loadedKey !== null) {
    setLoadedKey(null)
  }

  const styles: { [key: string]: CSSProperties } = {
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 600,
      color: 'var(--text-primary)',
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '2px solid var(--border)',
      borderRadius: '8px',
      backgroundColor: 'var(--bg-card)',
      color: 'var(--text-primary)',
      fontSize: '1rem',
    },
    textarea: {
      width: '100%',
      padding: '12px',
      border: '2px solid var(--border)',
      borderRadius: '8px',
      backgroundColor: 'var(--bg-card)',
      color: 'var(--text-primary)',
      fontSize: '1rem',
      minHeight: '100px',
      resize: 'vertical' as const,
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px',
    },
    button: {
      flex: 1,
      padding: '12px',
      border: 'none',
      borderRadius: '8px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.3s',
    },
    confirmButton: {
      backgroundColor: 'var(--brand-primary)',
      color: 'white',
    },
    cancelButton: {
      backgroundColor: 'var(--brand-gray)',
      color: 'white',
    },
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!vehicle) return

    onConfirm({
      driver,
      km: parseInt(km),
      obs
    })

    // Reset form
    setDriver('')
    setKm('')
    setObs('')
  }

  if (!vehicle) return null

  const title = serviceType === 'man' 
    ? t('serviceTitleMaint', currentLang) 
    : t('serviceTitleWash', currentLang)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <form onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label}>{t('lblVehicle', currentLang)}</label>
          <p style={{ fontWeight: 600 }}>{vehicle.tag} - {vehicle.model}</p>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t('lblDriver', currentLang)}</label>
          <input
            type="text"
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t('lblKm', currentLang)}</label>
          <input
            type="number"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            style={styles.input}
            min={vehicle.km}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t('lblObs', currentLang)}</label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            style={styles.textarea}
          />
        </div>

        <div style={styles.buttonGroup}>
          <button
            type="button"
            onClick={onClose}
            style={{ ...styles.button, ...styles.cancelButton }}
          >
            {t('btnCancel', currentLang)}
          </button>
          <button
            type="submit"
            style={{ ...styles.button, ...styles.confirmButton }}
          >
            {t('btnConfirmService', currentLang)}
          </button>
        </div>
      </form>
    </Modal>
  )
}