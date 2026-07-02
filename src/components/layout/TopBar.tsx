'use client'

import { t } from '@/lib/hooks/useTranslations'
import { CSSProperties } from 'react'
import { Menu, Truck, Sun, Moon, ShieldCheck, Plus } from 'lucide-react'

interface TopBarProps {
  sidebarOpen: boolean
  currentLang: string
  theme: string
  isAdmin: boolean
  onToggleSidebar: () => void
  onLanguageChange: (lang: string) => void
  onToggleTheme: () => void
  onToggleAdmin: () => void
  onAddVehicle: () => void
}

export default function TopBar({
  sidebarOpen,
  currentLang,
  theme,
  isAdmin,
  onToggleSidebar,
  onLanguageChange,
  onToggleTheme,
  onToggleAdmin,
  onAddVehicle
}: TopBarProps) {
  const styles: { [key: string]: CSSProperties } = {
    topBar: {
      backgroundColor: 'var(--bg-card)',
      padding: '15px 25px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexWrap: 'wrap',
      gap: '10px',
    },
    logoSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 15px',
      background: 'linear-gradient(135deg, #009688, #00796b)',
      borderRadius: '8px',
      color: 'white',
      height: '45px',
    },
    prontosPhrase: {
      background: 'linear-gradient(90deg, #f39c12, #e74c3c)',
      color: 'white',
      padding: '8px 20px',
      borderRadius: '20px',
      fontWeight: 800,
      fontSize: '1rem',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      boxShadow: '0 4px 10px rgba(243, 156, 18, 0.4)',
      whiteSpace: 'nowrap',
    },
  }

  return (
    <div style={styles.topBar}>
      <button
        onClick={onToggleSidebar}
        className="menu-toggle-btn"
        style={{
          background: 'linear-gradient(135deg, #009688, #00796b)',
          border: 'none',
          color: 'white',
          padding: '10px 18px',
          borderRadius: '12px',
          cursor: 'pointer',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          height: '45px',
          boxShadow: '0 4px 15px rgba(0, 150, 136, 0.4)',
          transition: 'all 0.3s ease',
        }}
      >
        <Menu size={18} />
        <span style={{ fontSize: '0.9rem' }}>Menu</span>
      </button>

      <div style={styles.logoSection}>
        <Truck size={20} />
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Frota Infratech</h1>
      </div>

      <div style={styles.prontosPhrase}>
        {t('prontosPhrase', currentLang)}
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <select
          value={currentLang}
          onChange={(e) => onLanguageChange(e.target.value)}
          style={{ height: '45px', borderRadius: '25px', border: '2px solid #009688', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', padding: '0 15px' }}
        >
          <option value="pt">🇧🇷 PT</option>
          <option value="en">🇺🇸 EN</option>
          <option value="es">🇪🇸 ES</option>
        </select>

        <button
          onClick={onToggleTheme}
          style={{ background: 'none', border: '2px solid #009688', color: '#009688', padding: '8px 15px', borderRadius: '25px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', height: '45px' }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? t('themeLight', currentLang) : t('themeDark', currentLang)}</span>
        </button>

        <button
          onClick={onToggleAdmin}
          style={{ background: isAdmin ? '#27ae60' : 'none', border: `2px solid ${isAdmin ? '#27ae60' : '#009688'}`, color: isAdmin ? 'white' : '#009688', padding: '8px 15px', borderRadius: '25px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', height: '45px' }}
        >
          {isAdmin && <span style={{ width: '8px', height: '8px', backgroundColor: 'white', borderRadius: '50%', animation: 'pulse 2s infinite' }} />}
          <ShieldCheck size={16} />
          <span>{isAdmin ? t('adminActive', currentLang) : t('adminInactive', currentLang)}</span>
        </button>

        {isAdmin && (
          <button
            onClick={onAddVehicle}
            style={{ background: '#009688', border: '2px solid #009688', color: 'white', padding: '8px 15px', borderRadius: '25px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', height: '45px' }}
          >
            <Plus size={16} />
            <span>{t('btnAdd', currentLang)}</span>
          </button>
        )}
      </div>
    </div>
  )
}