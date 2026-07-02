'use client'

import { useState, FormEvent } from 'react'
import { t } from '@/lib/hooks/useTranslations'
import Modal from './Modal'
import { CSSProperties } from 'react'
import { Lock } from 'lucide-react'
import { SEMANTIC_COLORS } from '@/lib/statusColor'

interface PinModalProps {
  isOpen: boolean
  onClose: () => void
  currentLang: string
  error: boolean
  onVerify: (pin: string) => void
}

export default function PinModal({
  isOpen,
  onClose,
  currentLang,
  error,
  onVerify
}: PinModalProps) {
  const [pin, setPin] = useState('')

  const styles: { [key: string]: CSSProperties } = {
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      marginBottom: '10px',
      fontWeight: 600,
      color: 'var(--text-primary)',
      textAlign: 'center',
    },
    input: {
      width: '100%',
      padding: '16px',
      border: `2px solid ${error ? SEMANTIC_COLORS.anormal : 'var(--border)'}`,
      borderRadius: '8px',
      backgroundColor: 'var(--bg-card)',
      color: 'var(--text-primary)',
      fontSize: '1.5rem',
      textAlign: 'center',
      letterSpacing: '8px',
      fontWeight: 700,
    },
    error: {
      color: SEMANTIC_COLORS.anormal,
      textAlign: 'center',
      marginTop: '10px',
      fontWeight: 600,
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
    icon: {
      fontSize: '3rem',
      textAlign: 'center',
      marginBottom: '20px',
      color: 'var(--text-primary)',
    },
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (pin.length >= 4) {
      onVerify(pin)
      setPin('')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('modalAdmin', currentLang)}
      maxWidth="400px"
    >
      <div style={{ ...styles.icon, display: 'flex', justifyContent: 'center' }}>
        <Lock size={48} />
      </div>
      
      <form onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label}>{t('pinMsg', currentLang)}</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            style={styles.input}
            placeholder="••••"
            maxLength={4}
            autoFocus
            required
          />
          {error && (
            <p style={styles.error}>{t('pinError', currentLang)}</p>
          )}
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
            disabled={pin.length < 4}
          >
            {t('btnEnter', currentLang)}
          </button>
        </div>
      </form>
    </Modal>
  )
}