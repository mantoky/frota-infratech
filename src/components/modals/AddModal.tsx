'use client'

import { useState, FormEvent } from 'react'
import { t } from '@/lib/hooks/useTranslations'
import { Vehicle } from '@/types'
import Modal from './Modal'
import { CSSProperties } from 'react'

interface AddModalProps {
  isOpen: boolean
  onClose: () => void
  currentLang: string
  onAdd: (vehicle: Partial<Vehicle>) => void
}

export default function AddModal({
  isOpen,
  onClose,
  currentLang,
  onAdd
}: AddModalProps) {
  const [tag, setTag] = useState('')
  const [plate, setPlate] = useState('')
  const [model, setModel] = useState('')
  const [status, setStatus] = useState<'disp' | 'uso' | 'lav' | 'man'>('disp')
  const [km, setKm] = useState('0')
  const [fuel, setFuel] = useState('Reserva')
  const [maintenance, setMaintenance] = useState('')

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
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '15px',
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    onAdd({
      id: Date.now(),
      tag,
      plate,
      model,
      status,
      km: parseInt(km) || 0,
      fuel: getFuelPercent(fuel),
      fuelText: fuel,
      maintenance: parseInt(maintenance) || 0,
      driver: '',
      lastLocation: '',
      obs: ''
    })

    // Reset form
    setTag('')
    setPlate('')
    setModel('')
    setStatus('disp')
    setKm('0')
    setFuel('Reserva')
    setMaintenance('')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('modalAdd', currentLang)}
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit}>
        <div style={styles.grid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('lblTag', currentLang)}</label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              style={styles.input}
              placeholder="TN-01"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('lblPlate', currentLang)}</label>
            <input
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              style={styles.input}
              placeholder="ABC1D23"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('lblModel', currentLang)}</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={styles.input}
              placeholder="Toyota Hilux"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('lblStatus', currentLang)}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'disp' | 'uso' | 'lav' | 'man')}
              style={styles.select}
              required
            >
              <option value="disp">{t('statusAvailable', currentLang)}</option>
              <option value="uso">{t('statusInUse', currentLang)}</option>
              <option value="lav">{t('statusWash', currentLang)}</option>
              <option value="man">{t('statusMaintenance', currentLang)}</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('lblKm', currentLang)}</label>
            <input
              type="number"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              style={styles.input}
              min="0"
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

          <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
            <label style={styles.label}>{t('lblNextMaint', currentLang)}</label>
            <input
              type="number"
              value={maintenance}
              onChange={(e) => setMaintenance(e.target.value)}
              style={styles.input}
              min="0"
              placeholder="10000"
            />
          </div>
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
            {t('btnAdd', currentLang)}
          </button>
        </div>
      </form>
    </Modal>
  )
}