'use client'

import { CSSProperties } from 'react'
import { Menu, Settings, Plus, Moon, Sun, ShieldCheck, User } from 'lucide-react'
import { PageType } from '@/types'
import { t } from '@/lib/hooks/useTranslations'

interface TopBarProps {
  sidebarOpen: boolean
  currentLang: string
  isAdmin: boolean
  theme: string
  onToggleSidebar: () => void
  onToggleTheme: () => void
  onNavigate: (page: PageType) => void
  onAddVehicle: () => void
}

export default function TopBar({
  sidebarOpen,
  currentLang,
  isAdmin,
  theme,
  onToggleSidebar,
  onToggleTheme,
  onNavigate,
  onAddVehicle
}: TopBarProps) {
  const styles: { [key: string]: CSSProperties } = {
    topBar: {
      backgroundColor: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      padding: '0 var(--space-5)',
      height: 'var(--topbar-height)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      gap: 'var(--space-3)',
    },
    iconButton: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 42,
      height: 42,
      minHeight: 42,
      borderRadius: 'var(--radius-s)',
      border: '1px solid var(--border)',
      background: 'var(--bg-card)',
      color: 'var(--text-secondary)',
      cursor: 'pointer',
      transition: 'all var(--duration-fast) var(--ease-out)',
    },
  }

  return (
    <header style={styles.topBar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Abrir menu de navegação"
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          className="topbar__menu-toggle"
          style={{ ...styles.iconButton, color: 'var(--text-primary)' }}
        >
          <Menu size={19} />
        </button>

        {/* Identidade da unidade operacional. Num sistema que vai atender
            varias regionais, saber "onde estou" precisa ser permanente e nao
            algo que so aparece depois de entrar na pagina de Regionais. */}
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.94rem',
              fontWeight: 700,
              letterSpacing: '-0.018em',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Gestão de Frota
          </p>
          <p
            className="topbar__subtitle"
            style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.02em' }}
          >
            Infratech · Operação corporativa
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <span
          title={isAdmin ? 'Sessão com privilégios administrativos' : 'Sessão operacional'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 32,
            padding: '0 10px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            backgroundColor: isAdmin ? 'var(--brand-accent-soft)' : 'var(--bg-inset)',
            color: isAdmin ? 'var(--alert-text)' : 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {isAdmin ? <ShieldCheck size={13} /> : <User size={13} />}
          <span className="topbar__role-label">{isAdmin ? 'Admin' : 'Operador'}</span>
        </span>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          style={styles.iconButton}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          type="button"
          onClick={() => onNavigate('settings')}
          aria-label={t('menuSettings', currentLang)}
          style={styles.iconButton}
        >
          <Settings size={18} />
        </button>

        {isAdmin && (
          <button type="button" onClick={onAddVehicle} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span className="topbar__add-label">{t('btnAdd', currentLang)}</span>
          </button>
        )}
      </div>
    </header>
  )
}
