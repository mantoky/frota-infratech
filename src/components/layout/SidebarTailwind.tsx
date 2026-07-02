'use client'

import { t } from '@/lib/hooks/useTranslations'
import { FilterType, PageType } from '@/types'

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
  const filters: FilterType[] = ['disp', 'uso', 'lav', 'man']

  const getFilterIcon = (filter: FilterType) => {
    const icons: Record<FilterType, string> = {
      'all': 'fa-list',
      'disp': 'fa-check',
      'uso': 'fa-clock',
      'lav': 'fa-soap',
      'man': 'fa-wrench'
    }
    return icons[filter]
  }

  const getFilterLabel = (filter: FilterType): string => {
    const labels: Record<FilterType, string> = {
      'all': 'statAll',
      'disp': 'statAvailable',
      'uso': 'statInUse',
      'lav': 'statWash',
      'man': 'statMaintenance'
    }
    return labels[filter]
  }

  const menuItems: { page: PageType; icon: string; label: string }[] = [
    { page: 'dashboard', icon: 'fa-th-large', label: 'menuDashboard' },
    { page: 'drivers', icon: 'fa-users', label: 'menuDrivers' },
    { page: 'settings', icon: 'fa-cog', label: 'menuSettings' },
  ]

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-[280px] bg-[var(--bg-sidebar)] text-[var(--text-light)] z-[1000] transition-all duration-300 ease-in-out overflow-y-auto ${
          sidebarOpen ? 'left-0' : '-left-[280px]'
        }`}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#009688] to-[#00796b] flex items-center justify-center gap-3 h-[60px]">
          <i className="fas fa-truck text-xl"></i>
          <h1 className="text-lg font-bold">{t('sidebarTitle', currentLang)}</h1>
        </div>

        {/* Navigation */}
        <nav className="py-5">
          {/* Main Section */}
          <div className="mb-6">
            <div className="px-5 py-2.5 text-xs uppercase text-[var(--text-secondary)] font-semibold tracking-wider">
              {t('menuMain', currentLang)}
            </div>
            <div
              className={`px-5 py-3 cursor-pointer flex items-center gap-3 transition-all ${
                currentPage === 'dashboard' 
                  ? 'bg-white/10 border-l-4 border-[#009688]' 
                  : 'hover:bg-white/5'
              }`}
              onClick={() => { onNavigate('dashboard'); onClose(); }}
            >
              <i className="fas fa-th-large w-6 text-center"></i>
              <span>{t('menuDashboard', currentLang)}</span>
            </div>
          </div>

          {/* Filters Section */}
          <div className="mb-6">
            <div className="px-5 py-2.5 text-xs uppercase text-[var(--text-secondary)] font-semibold tracking-wider">
              {t('menuFilters', currentLang)}
            </div>
            {filters.map(filter => (
              <div
                key={filter}
                className={`px-5 py-3 cursor-pointer flex items-center gap-3 transition-all ${
                  currentFilter === filter 
                    ? 'bg-white/10 border-l-4 border-[#009688]' 
                    : 'hover:bg-white/5'
                }`}
                onClick={() => { onFilterChange(filter); onClose(); }}
              >
                <i className={`fas ${getFilterIcon(filter)} w-6 text-center`}></i>
                <span>{t(getFilterLabel(filter), currentLang)}</span>
              </div>
            ))}
          </div>

          {/* Reports Section */}
          <div className="mb-6">
            <div className="px-5 py-2.5 text-xs uppercase text-[var(--text-secondary)] font-semibold tracking-wider">
              {t('menuReports', currentLang)}
            </div>
            <div
              className={`px-5 py-3 cursor-pointer flex items-center gap-3 transition-all ${
                currentPage === 'drivers' 
                  ? 'bg-white/10 border-l-4 border-[#009688]' 
                  : 'hover:bg-white/5'
              }`}
              onClick={() => { onNavigate('drivers'); onClose(); }}
            >
              <i className="fas fa-users w-6 text-center"></i>
              <span>{t('menuDrivers', currentLang)}</span>
            </div>
            <div
              className="px-5 py-3 cursor-pointer flex items-center gap-3 transition-all hover:bg-white/5"
              onClick={() => { onHistoryOpen(); onClose(); }}
            >
              <i className="fas fa-history w-6 text-center"></i>
              <span>{t('menuHistory', currentLang)}</span>
            </div>
          </div>

          {/* System Section */}
          <div className="mb-6">
            <div className="px-5 py-2.5 text-xs uppercase text-[var(--text-secondary)] font-semibold tracking-wider">
              {t('menuSystem', currentLang)}
            </div>
            <div
              className={`px-5 py-3 cursor-pointer flex items-center gap-3 transition-all ${
                currentPage === 'settings' 
                  ? 'bg-white/10 border-l-4 border-[#009688]' 
                  : 'hover:bg-white/5'
              }`}
              onClick={() => { onNavigate('settings'); onClose(); }}
            >
              <i className="fas fa-cog w-6 text-center"></i>
              <span>{t('menuSettings', currentLang)}</span>
            </div>
          </div>
        </nav>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[999]"
          onClick={onClose}
        />
      )}
    </>
  )
}