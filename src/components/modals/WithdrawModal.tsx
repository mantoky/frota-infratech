'use client'

import { useState, FormEvent, CSSProperties } from 'react'
import { t } from '@/lib/hooks/useTranslations'
import { Vehicle, ChecklistField, ChecklistPhoto } from '@/types'
import Modal from './Modal'
import { captureLocation, GeoPoint } from '@/lib/geolocation'
import { SEMANTIC_COLORS } from '@/lib/statusColor'
import PhotoUploader from '@/components/checklist/PhotoUploader'

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: Vehicle | null
  currentLang: string
  drivers: string[]
  checklistFields: ChecklistField[]
  onConfirm: (data: {
    driver: string
    km: number
    fuel: string
    fuelPercent: number
    obs: string
    checkProntos: boolean
    location: GeoPoint | null
    photos: ChecklistPhoto[]
    customChecklistData: Record<string, boolean>
  }) => void
}

export default function WithdrawModal({
  isOpen,
  onClose,
  vehicle,
  currentLang,
  drivers,
  checklistFields,
  onConfirm
}: WithdrawModalProps) {
  const [driver, setDriver] = useState('')
  const [km, setKm] = useState('')
  const [fuel, setFuel] = useState('Reserva')
  const [obs, setObs] = useState('')
  const [kmError, setKmError] = useState(false)
  const [photos, setPhotos] = useState<ChecklistPhoto[]>([])
  const [checks, setChecks] = useState<Record<string, boolean>>({})

  const activeFields = checklistFields.filter(f => f.active)
  const allChecked = activeFields.length === 0 || activeFields.every(f => checks[f.id])

  const styles: { [key: string]: CSSProperties } = {
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 600, color: 'var(--text-primary)' },
    input: { width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '1rem' },
    select: { width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '1rem' },
    textarea: { width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '1rem', minHeight: '100px', resize: 'vertical' as const },
    error: { color: SEMANTIC_COLORS.anormal, fontSize: '0.875rem', marginTop: '5px' },
    buttonGroup: { display: 'flex', gap: '10px', marginTop: '20px' },
    button: { flex: 1, padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' },
    confirmButton: { backgroundColor: 'var(--brand-primary)', color: 'white' },
    cancelButton: { backgroundColor: 'var(--brand-gray)', color: 'white' },
    checkItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 8, background: 'var(--bg-main)' }
  }

  const getFuelPercent = (text: string): number => {
    const map: { [key: string]: number } = { Reserva: 10, '1/4': 25, '2/4': 50, '3/4': 75, Cheio: 100 }
    return map[text] || 50
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!vehicle) return
    const kmValue = parseInt(km)
    if (kmValue < vehicle.km) {
      setKmError(true)
      return
    }
    const location = await captureLocation()
    onConfirm({
      driver, km: kmValue, fuel, fuelPercent: getFuelPercent(fuel), obs,
      checkProntos: allChecked, location, photos, customChecklistData: checks
    })
    setDriver(''); setKm(''); setFuel('Reserva'); setObs(''); setKmError(false); setPhotos([]); setChecks({})
  }

  if (!vehicle) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('modalWithdraw', currentLang)}>
      <form onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label}>{t('lblVehicle', currentLang)}</label>
          <p style={{ fontWeight: 600 }}>{vehicle.tag} - {vehicle.model}</p>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>{t('lblDriver', currentLang)}</label>
          <input type="text" value={driver} onChange={(e) => setDriver(e.target.value)} style={styles.input} list="drivers-datalist" required />
          <datalist id="drivers-datalist">{drivers.map(name => <option key={name} value={name} />)}</datalist>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>{t('lblKm', currentLang)}</label>
          <input type="number" value={km} onChange={(e) => { setKm(e.target.value); setKmError(false) }} style={styles.input} min={vehicle.km} required />
          {kmError && <p style={styles.error}>{t('errorKm', currentLang)}</p>}
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>{t('lblFuel', currentLang)}</label>
          <select value={fuel} onChange={(e) => setFuel(e.target.value)} style={styles.select} required>
            <option value="Reserva">Reserva</option>
            <option value="1/4">1/4</option>
            <option value="2/4">2/4</option>
            <option value="3/4">3/4</option>
            <option value="Cheio">Cheio</option>
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Checklist de Saída</label>
          {activeFields.map(field => (
            <label key={field.id} style={styles.checkItem}>
              <input type="checkbox" checked={!!checks[field.id]} onChange={e => setChecks(prev => ({ ...prev, [field.id]: e.target.checked }))} />
              <span>{field.label}</span>
            </label>
          ))}
        </div>
        <div style={styles.formGroup}>
          <PhotoUploader photos={photos} onChange={setPhotos} maxPhotos={5} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>{t('lblObs', currentLang)}</label>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} style={styles.textarea} />
        </div>
        <div style={styles.buttonGroup}>
          <button type="button" onClick={onClose} style={{ ...styles.button, ...styles.cancelButton }}>{t('btnCancel', currentLang)}</button>
          <button type="submit" disabled={!allChecked} style={{ ...styles.button, ...styles.confirmButton, ...(!allChecked ? { backgroundColor: '#ccc', cursor: 'not-allowed' } : {}) }}>{t('btnConfirm', currentLang)}</button>
        </div>
      </form>
    </Modal>
  )
}
