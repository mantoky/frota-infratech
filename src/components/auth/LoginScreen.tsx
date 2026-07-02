'use client'

import { useState, FormEvent, CSSProperties } from 'react'
import { t } from '@/lib/hooks/useTranslations'
import { Lock, ChevronDown, Download } from 'lucide-react'
import { SEMANTIC_COLORS } from '@/lib/statusColor'

interface LoginScreenProps {
  currentLang: string
  error: boolean
  onEnterCommon: () => void
  onEnterAdmin: (pin: string) => void
  canInstall: boolean
  onInstall: () => void
}

export default function LoginScreen({
  currentLang,
  error,
  onEnterCommon,
  onEnterAdmin,
  canInstall,
  onInstall
}: LoginScreenProps) {
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [pin, setPin] = useState('')

  const styles: { [key: string]: CSSProperties } = {
    page: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-main)',
      padding: '24px',
    },
    card: {
      width: '100%',
      maxWidth: '360px',
      backgroundColor: 'var(--bg-card)',
      borderRadius: '16px',
      padding: '40px 32px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
      textAlign: 'center',
    },
    icon: {
      width: '64px',
      height: '64px',
      borderRadius: '16px',
      margin: '0 auto 20px',
      display: 'block',
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: 700,
      color: 'var(--text-primary)',
      marginBottom: '4px',
    },
    subtitle: {
      color: 'var(--text-secondary)',
      marginBottom: '32px',
    },
    enterButton: {
      width: '100%',
      padding: '14px',
      border: 'none',
      borderRadius: '8px',
      backgroundColor: 'var(--brand-secondary)',
      color: 'white',
      fontSize: '1rem',
      fontWeight: 600,
      cursor: 'pointer',
    },
    adminToggle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      width: '100%',
      marginTop: '20px',
      padding: '8px',
      border: 'none',
      background: 'none',
      color: 'var(--text-secondary)',
      fontSize: '0.9rem',
      cursor: 'pointer',
    },
    input: {
      width: '100%',
      padding: '14px',
      border: `2px solid ${error ? SEMANTIC_COLORS.anormal : 'var(--border)'}`,
      borderRadius: '8px',
      backgroundColor: 'var(--bg-main)',
      color: 'var(--text-primary)',
      fontSize: '1.4rem',
      textAlign: 'center',
      letterSpacing: '8px',
      fontWeight: 700,
      marginBottom: '12px',
    },
    error: {
      color: SEMANTIC_COLORS.anormal,
      fontSize: '0.85rem',
      marginBottom: '12px',
      fontWeight: 600,
    },
    adminSubmit: {
      width: '100%',
      padding: '12px',
      border: 'none',
      borderRadius: '8px',
      backgroundColor: 'var(--brand-secondary)',
      color: 'white',
      fontWeight: 600,
      cursor: 'pointer',
    },
    installButton: {
      width: '100%',
      padding: '12px',
      border: '2px solid var(--brand-secondary)',
      borderRadius: '8px',
      backgroundColor: 'transparent',
      color: 'var(--brand-secondary)',
      fontSize: '0.95rem',
      fontWeight: 600,
      cursor: 'pointer',
      marginTop: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    },
  }

  const handleAdminSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (pin.length >= 4) {
      onEnterAdmin(pin)
      setPin('')
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <img src="/icon.svg" alt="" style={styles.icon} />
        <h1 style={styles.title}>Frota Infratech</h1>
        <p style={styles.subtitle}>{t('loginSubtitle', currentLang)}</p>

        <button style={styles.enterButton} onClick={onEnterCommon}>
          {t('btnEnter', currentLang)}
        </button>

        {canInstall && (
          <button style={styles.installButton} onClick={onInstall}>
            <Download size={16} />
            {t('btnInstallApp', currentLang)}
          </button>
        )}

        <button
          style={styles.adminToggle}
          onClick={() => setShowAdminForm(!showAdminForm)}
        >
          {t('btnAdminAccess', currentLang)}
          <ChevronDown size={16} style={{ transform: showAdminForm ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {showAdminForm && (
          <form onSubmit={handleAdminSubmit} style={{ marginTop: '16px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: 'var(--text-primary)' }}>
              <Lock size={32} />
            </div>
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
            {error && <p style={styles.error}>{t('pinError', currentLang)}</p>}
            <button type="submit" style={styles.adminSubmit} disabled={pin.length < 4}>
              {t('btnEnter', currentLang)}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
