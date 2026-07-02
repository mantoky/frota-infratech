'use client'

import { useState, useEffect } from 'react'

import { Vehicle, PageType, FilterType } from '@/types'
import translations from '@/lib/translations.json'
import { calculateDriverKm, getDriverStats, generateVehicleId, findLastWithdrawal, haversineKm, parseDateTime, isValidAdminPin } from '@/lib/helpers'
import { GeoPoint } from '@/lib/geolocation'
import { useFleetData } from '@/lib/hooks/useFleetData'
import { generateFleetReport } from '@/lib/pdf'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import DashboardPage from '@/components/dashboard/DashboardPage'
import HistoryPanel from '@/components/dashboard/HistoryPanel'
import WithdrawModal from '@/components/modals/WithdrawModal'
import ReturnModal from '@/components/modals/ReturnModal'
import ServiceModal from '@/components/modals/ServiceModal'
import ManageModal from '@/components/modals/ManageModal'
import AddModal from '@/components/modals/AddModal'
import PinModal from '@/components/modals/PinModal'
import LoginScreen from '@/components/auth/LoginScreen'

const t = (key: string, lang: string): string => {
  const translationsData = translations as Record<string, Record<string, string>>
  return translationsData[key]?.[lang] || translationsData[key]?.['pt'] || key
}

export default function FrotaInfratech() {
  const { vehicles, setVehicles, history, loading, saveData, addToHistory } = useFleetData()
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all')
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentLang, setCurrentLang] = useState('pt')
  const [theme, setTheme] = useState('light')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')
  const [appEntered, setAppEntered] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [loginPinError, setLoginPinError] = useState(false)

  const [withdrawModal, setWithdrawModal] = useState(false)
  const [returnModal, setReturnModal] = useState(false)
  const [serviceModal, setServiceModal] = useState(false)
  const [manageModal, setManageModal] = useState(false)
  const [addModal, setAddModal] = useState(false)
  const [pinModal, setPinModal] = useState(false)

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [serviceType, setServiceType] = useState<'man' | 'lav'>('man')
  const [pinError, setPinError] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [pendingVehicleData, setPendingVehicleData] = useState<Partial<Vehicle> | null>(null)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- restaura preferências do localStorage após a montagem; o HTML estático é pré-renderizado sem acesso ao localStorage, então isso precisa acontecer no cliente, depois do primeiro paint */
    const storedLang = localStorage.getItem('frota_lang')
    const storedTheme = localStorage.getItem('theme')
    const storedAdmin = localStorage.getItem('isAdmin')
    const storedEntered = localStorage.getItem('frota_entered')

    if (storedLang) setCurrentLang(storedLang)
    if (storedTheme) setTheme(storedTheme)
    if (storedAdmin === 'true') setIsAdmin(true)
    if (storedEntered === 'true') setAppEntered(true)
    setAuthChecked(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const changeLanguage = (lang: string) => { setCurrentLang(lang); localStorage.setItem('frota_lang', lang) }

  const enterCommon = () => { setAppEntered(true); localStorage.setItem('frota_entered', 'true') }
  const enterAdmin = (pin: string) => {
    if (isValidAdminPin(pin)) {
      setLoginPinError(false)
      setIsAdmin(true); localStorage.setItem('isAdmin', 'true')
      setAppEntered(true); localStorage.setItem('frota_entered', 'true')
    } else {
      setLoginPinError(true)
    }
  }
  const logout = () => {
    setIsAdmin(false); localStorage.removeItem('isAdmin')
    setAppEntered(false); localStorage.removeItem('frota_entered')
  }

  const verifyPin = (pin: string) => {
    if (isValidAdminPin(pin)) {
      setPinError(false); setPinModal(false)
      if (pendingAction === 'login') { setIsAdmin(true); localStorage.setItem('isAdmin', 'true') }
      else if (pendingAction === 'delete' && selectedVehicle) deleteVehicle()
      else if (pendingAction === 'add' && pendingVehicleData) addNewVehicle(pendingVehicleData)
      else if (pendingAction === 'unblock' && selectedVehicle) unblockVehicle()
      setPendingAction(null); setPendingVehicleData(null)
    } else {
      setPinError(true)
    }
  }

  const deleteVehicle = () => {
    if (!selectedVehicle) return
    const newVehicles = vehicles.filter(v => v.id !== selectedVehicle.id)
    setVehicles(newVehicles); saveData(newVehicles, history); setManageModal(false); setSelectedVehicle(null)
  }

  const addNewVehicle = (data: Partial<Vehicle>) => {
    const newVehicle: Vehicle = {
      id: generateVehicleId(), tag: data.tag || '', plate: data.plate || '', model: data.model || '',
      status: data.status || 'disp', km: data.km || 0, fuel: data.fuel || 50, fuelText: data.fuelText || '50%',
      maintenance: data.maintenance || 10000, driver: '', lastLocation: '', obs: ''
    }
    const newVehicles = [...vehicles, newVehicle]
    setVehicles(newVehicles); saveData(newVehicles, history); setAddModal(false)
  }

  const openWithdrawModal = (vehicle: Vehicle) => { setSelectedVehicle(vehicle); setWithdrawModal(true) }
  const openReturnModal = (vehicle: Vehicle) => { setSelectedVehicle(vehicle); setReturnModal(true) }
  const openServiceModal = (type: 'man' | 'lav', vehicle: Vehicle) => { setSelectedVehicle(vehicle); setServiceType(type); setServiceModal(true) }
  const openManageModal = (vehicle: Vehicle) => { setSelectedVehicle(vehicle); setManageModal(true) }

  const handleWithdrawConfirm = (data: { driver: string; km: number; fuel: string; fuelPercent: number; obs: string; location: GeoPoint | null }) => {
    if (!selectedVehicle) return
    const updatedVehicle: Vehicle = { ...selectedVehicle, status: 'uso', driver: data.driver, km: data.km, fuel: data.fuelPercent, fuelText: data.fuel, obs: data.obs }
    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
    setVehicles(newVehicles)
    addToHistory(updatedVehicle, 'Retirada', data.driver, data.km, '', newVehicles, { location: data.location || undefined })
    setWithdrawModal(false); setSelectedVehicle(null)
  }

  const handleReturnConfirm = (data: { km: number; fuel: string; fuelPercent: number; location: string; locationSpecify: string; obs: string; coords: GeoPoint | null }) => {
    if (!selectedVehicle) return
    const location = data.location === 'Outros' ? data.locationSpecify : data.location
    const updatedVehicle: Vehicle = { ...selectedVehicle, status: 'disp', driver: '', km: data.km, fuel: data.fuelPercent, fuelText: data.fuel, lastLocation: location, obs: data.obs }
    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)

    const withdrawal = findLastWithdrawal(`${updatedVehicle.tag} (${updatedVehicle.plate})`, history)
    let distanceKm: number | undefined
    let travelTimeMinutes: number | undefined
    if (withdrawal?.location && data.coords) {
      distanceKm = haversineKm(withdrawal.location, data.coords)
      travelTimeMinutes = Math.max(0, (Date.now() - parseDateTime(withdrawal.date).getTime()) / 60000)
    }

    setVehicles(newVehicles)
    addToHistory(updatedVehicle, 'Devolucao', '', data.km, location, newVehicles, { location: data.coords || undefined, distanceKm, travelTimeMinutes })
    setReturnModal(false); setSelectedVehicle(null)
  }

  const handleServiceConfirm = (data: { driver: string; km: number; obs: string }) => {
    if (!selectedVehicle) return
    const updatedVehicle: Vehicle = { ...selectedVehicle, status: serviceType, driver: data.driver, km: data.km, obs: data.obs }
    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
    setVehicles(newVehicles); addToHistory(updatedVehicle, serviceType === 'man' ? 'Envio Manutencao' : 'Envio Lavador', data.driver, data.km, data.obs, newVehicles)
    setServiceModal(false); setSelectedVehicle(null)
  }

  const handleManageSave = (data: Partial<Vehicle>) => {
    if (!selectedVehicle) return
    const updatedVehicle = { ...selectedVehicle, ...data } as Vehicle
    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
    setVehicles(newVehicles); saveData(newVehicles, history); setManageModal(false); setSelectedVehicle(null)
  }

  const blockVehicle = (reason: string) => {
    if (!selectedVehicle) return
    const updatedVehicle: Vehicle = { ...selectedVehicle, blocked: true, blockedReason: reason, blockedBy: isAdmin ? 'Admin' : 'Usuario', blockedAt: new Date().toLocaleDateString('pt-BR') }
    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
    setVehicles(newVehicles); saveData(newVehicles, history)
  }

  const unblockVehicle = () => {
    if (!selectedVehicle) return
    const updatedVehicle: Vehicle = { ...selectedVehicle, blocked: false, blockedReason: '', blockedBy: '', blockedAt: '' }
    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
    setVehicles(newVehicles); saveData(newVehicles, history)
  }

  const handleAddVehicle = (data: Partial<Vehicle>) => {
    if (!isAdmin) { setPendingAction('add'); setPendingVehicleData(data); setPinModal(true); setAddModal(false) }
    else addNewVehicle(data)
  }

  const requestPin = (action: 'delete' | 'unblock') => {
    setPendingAction(action)
    if (action === 'delete') setManageModal(false)
    setPinModal(true)
  }

  const downloadPDF = () => generateFleetReport(vehicles, history)

  if (!authChecked) {
    return <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }} />
  }

  if (!appEntered) {
    return (
      <LoginScreen
        currentLang={currentLang}
        error={loginPinError}
        onEnterCommon={enterCommon}
        onEnterAdmin={enterAdmin}
      />
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '3rem' }}>⏳</div><p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Carregando...</p></div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <Sidebar
        currentPage={currentPage}
        currentFilter={currentFilter}
        sidebarOpen={sidebarOpen}
        currentLang={currentLang}
        onNavigate={setCurrentPage}
        onFilterChange={setCurrentFilter}
        onHistoryOpen={() => setHistoryPanelOpen(true)}
        onClose={() => setSidebarOpen(false)}
      />

      <main style={{ marginLeft: 0, minHeight: '100vh' }}>
        <TopBar
          sidebarOpen={sidebarOpen}
          currentLang={currentLang}
          isAdmin={isAdmin}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNavigate={setCurrentPage}
          onAddVehicle={() => setAddModal(true)}
        />

        {/* Dashboard */}
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

        {/* Drivers */}
        {currentPage === 'drivers' && (
          <div style={{ padding: '25px', maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{t('driversTitle', currentLang)}</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>{t('driversSubtitle', currentLang)}</p>
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginBottom: '15px' }}>🏆 {t('topDrivers', currentLang)}</h3>
              {getDriverStats(history).length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{t('noRecords', currentLang)}</p>
              ) : (
                getDriverStats(history).map((driver, index) => (
                  <div key={driver[0]} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', marginBottom: '8px', backgroundColor: 'var(--bg-main)', borderRadius: '8px', borderLeft: '4px solid var(--brand-primary)' }}>
                    <span>
                      <span style={{ marginRight: '10px' }}>{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</span>
                      {driver[0]}
                    </span>
                    <span><strong>{driver[1]} {t('withdrawals', currentLang)}</strong> - {calculateDriverKm(driver[0], history).toLocaleString()} km</span>
                  </div>
                ))
              )}
              <button onClick={downloadPDF} style={{ backgroundColor: '#e74c3c', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginTop: '15px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                📄 {t('btnDownloadHistory', currentLang)}
              </button>
            </div>
          </div>
        )}

        {/* Settings */}
        {currentPage === 'settings' && (
          <div style={{ padding: '25px', maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{t('settingsTitle', currentLang)}</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>{t('settingsSubtitle', currentLang)}</p>
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
              <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ marginBottom: '5px' }}>{t('setLang', currentLang)}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('setLangDesc', currentLang)}</p>
                </div>
                <select value={currentLang} onChange={(e) => changeLanguage(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  <option value="pt">Portugues</option><option value="en">English</option><option value="es">Espanol</option>
                </select>
              </div>

              <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                <div>
                  <h3 style={{ marginBottom: '5px' }}>{t('setTheme', currentLang)}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{theme === 'dark' ? t('setThemeDark', currentLang) : t('setThemeLight', currentLang)}</p>
                </div>
                <button onClick={toggleTheme} style={{ padding: '8px 16px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>
                  {theme === 'dark' ? `🌙 ${t('setThemeDark', currentLang)}` : `☀️ ${t('setThemeLight', currentLang)}`}
                </button>
              </div>

              <div style={{ padding: '20px', borderTop: '1px solid var(--border)' }}>
                <button onClick={logout} style={{ padding: '10px 16px', borderRadius: '5px', border: 'none', background: '#e74c3c', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                  {t('btnLogout', currentLang)}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <HistoryPanel
        isOpen={historyPanelOpen}
        onClose={() => setHistoryPanelOpen(false)}
        history={history}
        currentLang={currentLang}
        onDownloadPdf={downloadPDF}
      />

      <WithdrawModal
        isOpen={withdrawModal}
        onClose={() => setWithdrawModal(false)}
        vehicle={selectedVehicle}
        currentLang={currentLang}
        onConfirm={handleWithdrawConfirm}
      />

      <ServiceModal
        isOpen={serviceModal}
        onClose={() => setServiceModal(false)}
        vehicle={selectedVehicle}
        serviceType={serviceType}
        currentLang={currentLang}
        onConfirm={handleServiceConfirm}
      />

      <ReturnModal
        isOpen={returnModal}
        onClose={() => setReturnModal(false)}
        vehicle={selectedVehicle}
        currentLang={currentLang}
        onConfirm={handleReturnConfirm}
      />

      <ManageModal
        isOpen={manageModal}
        onClose={() => setManageModal(false)}
        vehicle={selectedVehicle}
        currentLang={currentLang}
        isAdmin={isAdmin}
        onSave={handleManageSave}
        onDelete={deleteVehicle}
        onRequestPin={requestPin}
        onBlock={blockVehicle}
        onUnblock={unblockVehicle}
      />

      <AddModal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        currentLang={currentLang}
        onAdd={handleAddVehicle}
      />

      <PinModal
        isOpen={pinModal}
        onClose={() => { setPinModal(false); setPendingAction(null); setPinError(false) }}
        currentLang={currentLang}
        error={pinError}
        onVerify={verifyPin}
      />
    </div>
  )
}
