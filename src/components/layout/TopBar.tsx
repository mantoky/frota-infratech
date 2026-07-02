'use client'

import { CSSProperties } from 'react'
import { Menu, Settings, Plus } from 'lucide-react'
import { PageType } from '@/types'
import { t } from '@/lib/hooks/useTranslations'

interface TopBarProps {
  sidebarOpen: boolean
  currentLang: string
  isAdmin: boolean
  onToggleSidebar: () => void
  onNavigate: (page: PageType) => void
  onAddVehicle: () => void
}

export default function TopBar({
  sidebarOpen,
  currentLang,
  isAdmin,
  onToggleSidebar,
  onNavigate,
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
  }

  return (
    <div style={styles.topBar}>
      <button
        onClick={onToggleSidebar}
        className="menu-toggle-btn"
        style={{
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
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
          boxShadow: '0 4px 15px rgba(0, 46, 77, 0.4)',
          transition: 'all 0.3s ease',
        }}
      >
        <Menu size={18} />
        <span style={{ fontSize: '0.9rem' }}>Menu</span>
      </button>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={() => onNavigate('settings')}
          aria-label={t('menuSettings', currentLang)}
          style={{ background: 'none', border: '2px solid var(--brand-primary)', color: 'var(--brand-primary)', padding: '8px', borderRadius: '25px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '45px', width: '45px' }}
        >
          <Settings size={18} />
        </button>

        {isAdmin && (
          <button
            onClick={onAddVehicle}
            style={{ background: 'var(--brand-primary)', border: '2px solid var(--brand-primary)', color: 'white', padding: '8px 15px', borderRadius: '25px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', height: '45px' }}
          >
            <Plus size={16} />
            <span>{t('btnAdd', currentLang)}</span>
          </button>
        )}
      </div>
    </div>
  )
}
