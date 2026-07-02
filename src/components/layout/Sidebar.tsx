'use client'

import { t } from '@/lib/hooks/useTranslations'
import { FilterType, PageType } from '@/types'
import { CSSProperties } from 'react'

interface SidebarProps {
  currentPage: PageType
  currentFilter: FilterType
  sidebarOpen: boolean
  currentLang: string
  onNavigate: (page: PageType) => void
  onFilterChange: (filter: FilterType) => void
  onHistoryOpen: () => void
  onClose: () => void
}

export default function Sidebar({
  currentPage,
  currentFilter,
  sidebarOpen,
  currentLang,
  onNavigate,
  onFilterChange,
  onHistoryOpen,
  onClose
}: SidebarProps) {
  const styles: { [key: string]: CSSProperties } = {
    sidebar: {
      position: 'fixed',
      left: sidebarOpen ? 0 : '-280px',
      top: 0,
      height: '100vh',
      width: '280px',
      backgroundColor: 'var(--bg-sidebar)',
      color: 'var(--text-light)',
      zIndex: 1000,
      transition: 'left 0.3s ease',
      overflowY: 'auto',
    },
    sidebarHeader: {
      padding: '15px',
      background: 'linear-gradient(135deg, #009688, #00796b)',
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      height: '60px',
    },
    menuItem: {
      padding: '12px 20px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      transition: 'all 0.3s',
    }
  }

  const filters: FilterType[] = ['disp', 'uso', 'lav', 'man']

  return (
    <>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <i className="fas fa-truck" style={{ fontSize: '1.5rem' }}></i>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{t('sidebarTitle', currentLang)}</h1>
        </div>
        <nav style={{ padding: '20px 0' }}>
          <div style={{ marginBottom: '25px' }}>
            <div style={{ padding: '10px 20px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px' }}>
              {t('menuMain', currentLang)}
            </div>
            <div
              style={{ 
                ...styles.menuItem, 
                backgroundColor: currentPage === 'dashboard' ? 'rgba(255,255,255,0.1)' : 'transparent', 
                borderLeft: currentPage === 'dashboard' ? '4px solid #009688' : 'none' 
              }}
              onClick={() => { onNavigate('dashboard'); onClose(); }}
            >
              <i className="fas fa-th-large" style={{ width: '24px', textAlign: 'center' }}></i>
              <span>{t('menuDashboard', currentLang)}</span>
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <div style={{ padding: '10px 20px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px' }}>
              {t('menuFilters', currentLang)}
            </div>
            {filters.map(filter => (
              <div
                key={filter}
                style={{ 
                  ...styles.menuItem, 
                  backgroundColor: currentFilter === filter ? 'rgba(255,255,255,0.1)' : 'transparent', 
                  borderLeft: currentFilter === filter ? '4px solid #009688' : 'none' 
                }}
                onClick={() => { onFilterChange(filter); onClose(); }}
              >
                <i className={`fas fa-${filter === 'disp' ? 'check' : filter === 'uso' ? 'clock' : filter === 'lav' ? 'soap' : 'wrench'}`} style={{ width: '24px', textAlign: 'center' }}></i>
                <span>{t(`stat${filter.charAt(0).toUpperCase() + filter.slice(1) === 'Available' ? 'Available' : filter === 'disp' ? 'Available' : filter === 'uso' ? 'InUse' : filter === 'lav' ? 'Wash' : 'Maintenance'}`, currentLang)}</span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '25px' }}>
            <div style={{ padding: '10px 20px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px' }}>
              {t('menuReports', currentLang)}
            </div>
            <div
              style={{ 
                ...styles.menuItem, 
                backgroundColor: currentPage === 'drivers' ? 'rgba(255,255,255,0.1)' : 'transparent', 
                borderLeft: currentPage === 'drivers' ? '4px solid #009688' : 'none' 
              }}
              onClick={() => { onNavigate('drivers'); onClose(); }}
            >
              <i className="fas fa-users" style={{ width: '24px', textAlign: 'center' }}></i>
              <span>{t('menuDrivers', currentLang)}</span>
            </div>
            <div
              style={styles.menuItem}
              onClick={() => { onHistoryOpen(); onClose(); }}
            >
              <i className="fas fa-history" style={{ width: '24px', textAlign: 'center' }}></i>
              <span>{t('menuHistory', currentLang)}</span>
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <div style={{ padding: '10px 20px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px' }}>
              {t('menuSystem', currentLang)}
            </div>
            <div
              style={{ 
                ...styles.menuItem, 
                backgroundColor: currentPage === 'settings' ? 'rgba(255,255,255,0.1)' : 'transparent', 
                borderLeft: currentPage === 'settings' ? '4px solid #009688' : 'none' 
              }}
              onClick={() => { onNavigate('settings'); onClose(); }}
            >
              <i className="fas fa-cog" style={{ width: '24px', textAlign: 'center' }}></i>
              <span>{t('menuSettings', currentLang)}</span>
            </div>
          </div>
        </nav>
      </aside>

      {sidebarOpen && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }}
          onClick={onClose}
        />
      )}
    </>
  )
}