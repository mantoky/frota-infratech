'use client'

import { useState, FormEvent } from 'react'
import { t } from '@/lib/hooks/useTranslations'
import { Vehicle } from '@/types'
import Modal from './Modal'
import { CSSProperties } from 'react'
import { captureLocation, GeoPoint } from '@/lib/geolocation'

interface ReturnModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: Vehicle | null
  currentLang: string
  onConfirm: (data: {
    km: number
    fuel: string
    fuelPercent: number
    location: string
    locationSpecify: string
    obs: string
    coords: GeoPoint | null
  }) => void
}

export default function ReturnModal({
  isOpen,
  onClose,
  vehicle,
  currentLang,
  onConfirm
}: ReturnModalProps) {
  const [km, setKm] = useState('')
  const [fuel, setFuel] = useState('Reserva')
  const [location, setLocation] = useState('')
  const [locationSpecify, setLocationSpecify] = useState('')
  const [obs, setObs] = useState('')

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
    select: {
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
      backgroundColor: '#9b59b6',
      color: 'white',
    },
    cancelButton: {
      backgroundColor: '#95a5a6',
      color: 'white',
    },
  }

  const getFuelPercent = (text: string): number => {
    const map: { [key: string]: number } = {
      'Reserva': 10,
      '1/4': 25,
      '2/4': 50,
      '3/4': 75,
      'Cheio': 100
    }
    return map[text] || 50
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!vehicle) return

    const kmValue = parseInt(km)
    const coords = await captureLocation()
    onConfirm({
      km: kmValue,
      fuel,
      fuelPercent: getFuelPercent(fuel),
      location,
      locationSpecify,
      obs,
      coords
    })

    // Reset form
    setKm('')
    setFuel('Reserva')
    setLocation('')
    setLocationSpecify('')
    setObs('')
  }

  if (!vehicle) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('modalReturn', currentLang)}
    >
      <form onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label}>{t('lblVehicle', currentLang)}</label>
          <p style={{ fontWeight: 600 }}>{vehicle.tag} - {vehicle.model}</p>
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
          <label style={styles.label}>{t('lblFuel', currentLang)}</label>
          <select
            value={fuel}
            onChange={(e) => setFuel(e.target.value)}
            style={styles.select}
            required
          >
            <option value="Reserva">Reserva</option>
            <option value="1/4">1/4</option>
            <option value="2/4">2/4</option>
            <option value="3/4">3/4</option>
            <option value="Cheio">Cheio</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t('lblLocation', currentLang)}</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={styles.select}
            required
          >
            <option value="">Selecione...</option>
            <option value="Parauapebas">Parauapebas</option>
            <option value="Praca da Bandeira">Praca da Bandeira</option>
            <option value="CCO">CCO</option>
            <option value="Cafeteira">Cafeteira</option>
            <option value="Nucleo">Nucleo</option>
            <option value="Helio Grace">Helio Grace</option>
            <option value="Infratech">Infratech</option>
            <option value="Oficina Centralizada">Oficina Centralizada</option>
            <option value="Lavador">Lavador</option>
            <option value="Meio Ambiente">Meio Ambiente</option>
            <option value="Outros">Outros</option>
          </select>
        </div>

        {location === 'Outros' && (
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('lblSpecify', currentLang)}</label>
            <input
              type="text"
              value={locationSpecify}
              onChange={(e) => setLocationSpecify(e.target.value)}
              style={styles.input}
              required
            />
          </div>
        )}

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
            {t('btnConfirmReturn', currentLang)}
          </button>
        </div>
      </form>
    </Modal>
  )
}