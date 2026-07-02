'use client'

import { useState, useEffect } from 'react'
import { useFirebase } from '@/lib/hooks/useFirebase'
import { useModals } from '@/lib/hooks/useModals'
import { t } from '@/lib/hooks/useTranslations'
import { FilterType, PageType, Vehicle } from '@/types'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import DashboardPage from '@/components/dashboard/DashboardPage'
import WithdrawModal from '@/components/modals/WithdrawModal'

export default function FrotaInfratechRefactored() {
  // State
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all')
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentLang, setCurrentLang] = useState('pt')
  const [theme, setTheme] = useState('light')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')

  // Firebase hook
  const { vehicles, setVehicles, history, setHistory, loading, saveData, addToHistory, getFuelPercent } = useFirebase()

  // Modals hook
  const {
    withdrawModal,
    returnModal,
    serviceModal,
    manageModal,
    addModal,
    pinModal,
    selectedVehicle,
    serviceType,
    pendingAction,
    pendingVehicleData,
    openWithdrawModal,
    openReturnModal,
    openServiceModal,
    openManageModal,
    openAddModal,
    openPinModal,
    closeWithdrawModal,
    closeReturnModal,
    closeServiceModal,
    closeManageModal,
    closeAddModal,
    closePinModal,
    setSelectedVehicle,
    setServiceType,
    setPendingAction,
    setPendingVehicleData,
  } = useModals()

  // Form states
  const [withdrawDriver, setWithdrawDriver] = useState('')
  const [withdrawKm, setWithdrawKm] = useState('')
  const [withdrawFuel, setWithdrawFuel] = useState('Reserva')
  const [withdrawObs, setWithdrawObs] = useState('')
  const [checkProntos, setCheckProntos] = useState(false)

  // Load data from localStorage
  useEffect(() => {
    const storedLang = localStorage.getItem('frota_lang')
    const storedTheme = localStorage.getItem('theme')
    const storedAdmin = localStorage.getItem('isAdmin')

    if (storedLang) setCurrentLang(storedLang)
    if (storedTheme) setTheme(storedTheme)
    if (storedAdmin === 'true') setIsAdmin(true)
  }, [])

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Theme toggle
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // Language change
  const changeLanguage = (lang: string) => {
    setCurrentLang(lang)
    localStorage.setItem('frota_lang', lang)
  }

  // Admin toggle
  const toggleAdmin = () => {
    if (isAdmin) {
      setIsAdmin(false)
      localStorage.removeItem('isAdmin')
    } else {
      openPinModal('login')
    }
  }

  // Verify PIN
  const verifyPin = async () => {
    // Implementation would be similar to original
    // For now, just close modal
    closePinModal()
  }

  // Handle withdraw
  const handleWithdrawConfirm = (data: {
    driver: string
    km: number
    fuel: string
    fuelPercent: number
    obs: string
    checkProntos: boolean
  }) => {
    if (!selectedVehicle) return

    const updatedVehicle: Vehicle = {
      ...selectedVehicle,
      status: 'uso',
      driver: data.driver,
      km: data.km,
      fuel: data.fuelPercent,
      fuelText: data.fuel,
      obs: data.obs
    }

    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
    setVehicles(newVehicles)
    addToHistory(updatedVehicle, 'Retirada', data.driver, data.km, '', newVehicles)
    closeWithdrawModal()
  }

  // Get vehicle counts
  const counts = {
    all: vehicles.length,
    disp: vehicles.filter(v => v.status === 'disp').length,
    uso: vehicles.filter(v => v.status === 'uso').length,
    lav: vehicles.filter(v => v.status === 'lav').length,
    man: vehicles.filter(v => v.status === 'man').length
  }

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: 'var(--bg-main)',
      color: 'var(--text-primary)',
    },
    mainContent: {
      marginLeft: 0,
      minHeight: '100vh',
      transition: 'margin-left 0.3s ease',
    },
  }

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        currentFilter={currentFilter}
        sidebarOpen={sidebarOpen}
        currentLang={currentLang}
        onNavigate={setCurrentPage}
        onFilterChange={setCurrentFilter}
        onHistoryOpen={() => {}}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main style={styles.mainContent}>
        {/* Top Bar */}
        <TopBar
          sidebarOpen={sidebarOpen}
          currentLang={currentLang}
          theme={theme}
          isAdmin={isAdmin}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onLanguageChange={changeLanguage}
          onToggleTheme={toggleTheme}
          onToggleAdmin={toggleAdmin}
          onAddVehicle={openAddModal}
        />

        {/* Dashboard Page */}
        {currentPage === 'dashboard' && (
          <DashboardPage
            vehicles={vehicles}
            currentFilter={currentFilter}
            currentLang={currentLang}
            isAdmin={isAdmin}
            onFilterChange={setCurrentFilter}
            onWithdraw={openWithdrawModal}
            onReturn={openReturnModal}
            onService={openServiceModal}
            onManage={openManageModal}
          />
        )}

        {/* Other pages would be implemented similarly */}
        {currentPage === 'drivers' && (
          <div style={{ padding: '25px', maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{t('driversTitle', currentLang)}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>{t('driversSubtitle', currentLang)}</p>
          </div>
        )}

        {currentPage === 'settings' && (
          <div style={{ padding: '25px', maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{t('settingsTitle', currentLang)}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>{t('settingsSubtitle', currentLang)}</p>
          </div>
        )}
      </main>

      {/* Modals */}
      <WithdrawModal
        isOpen={withdrawModal}
        onClose={closeWithdrawModal}
        vehicle={selectedVehicle}
        currentLang={currentLang}
        onConfirm={handleWithdrawConfirm}
      />
    </div>
  )
}