'use client'

import { useState, useEffect } from 'react'

import { Vehicle, PageType, FilterType, ChecklistPhoto } from '@/types'
import translations from '@/lib/translations.json'
import { calculateDriverKm, getDriverStats, generateVehicleId, findLastWithdrawal, haversineKm, parseDateTime, isValidAdminPin } from '@/lib/helpers'
import { GeoPoint } from '@/lib/geolocation'
import { useFleetData } from '@/lib/hooks/useFleetData'
import { useOrgData } from '@/lib/hooks/useOrgData'
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
import AdminPage from '@/components/admin/AdminPage'
import MetricsPage from '@/components/metrics/MetricsPage'
import ForumPage from '@/components/forum/ForumPage'
import RegionaisPage from '@/components/org/RegionaisPage'
import { useInstallPrompt } from '@/lib/hooks/useInstallPrompt'

const t = (key: string, lang: string): string => {
  const translationsData = translations as Record<string, Record<string, string>>
  return translationsData[key]?.[lang] || translationsData[key]?.['pt'] || key
}

export default function FrotaInfratech() {
  const { vehicles, setVehicles, history, drivers, saveDrivers, loading, saveData, addToHistory } = useFleetData()
  const {
    regionais, gerencias, forumPosts, checklistFields,
    saveChecklistFields, createRegional, createGerencia,
    addForumPost, addForumComment, likeForumPost
  } = useOrgData()
  const { canInstall, promptInstall } = useInstallPrompt()
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
    const storedLang = localStorage.getItem('frota_lang')
    const storedTheme = localStorage.getItem('theme')
    const storedAdmin = localStorage.getItem('isAdmin')
    const storedEntered = localStorage.getItem('frota_entered')
    if (storedLang) setCurrentLang(storedLang)
    if (storedTheme) setTheme(storedTheme)
    if (storedAdmin === 'true') setIsAdmin(true)
    if (storedEntered === 'true') setAppEntered(true)
    setAuthChecked(true)
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
    } else setLoginPinError(true)
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
    } else setPinError(true)
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
      maintenance: data.maintenance || 10000, driver: '', lastLocation: '', obs: '',
      regionalId: data.regionalId || regionais[0]?.id,
      gerenciaId: data.gerenciaId,
      lastStatusChangeAt: new Date().toISOString(),
      lastWashedAt: new Date().toISOString()
    }
    const newVehicles = [...vehicles, newVehicle]
    setVehicles(newVehicles); saveData(newVehicles, history); setAddModal(false)
  }

  const openWithdrawModal = (vehicle: Vehicle) => { setSelectedVehicle(vehicle); setWithdrawModal(true) }
  const openReturnModal = (vehicle: Vehicle) => { setSelectedVehicle(vehicle); setReturnModal(true) }
  const openServiceModal = (type: 'man' | 'lav', vehicle: Vehicle) => { setSelectedVehicle(vehicle); setServiceType(type); setServiceModal(true) }
  const openManageModal = (vehicle: Vehicle) => { setSelectedVehicle(vehicle); setManageModal(true) }

  const handleWithdrawConfirm = (data: {
    driver: string; km: number; fuel: string; fuelPercent: number; obs: string
    location: GeoPoint | null; photos: ChecklistPhoto[]; customChecklistData: Record<string, boolean>
  }) => {
    if (!selectedVehicle) return
    const nowIso = new Date().toISOString()
    const updatedVehicle: Vehicle = {
      ...selectedVehicle, status: 'uso', driver: data.driver, km: data.km,
      fuel: data.fuelPercent, fuelText: data.fuel, obs: data.obs, lastStatusChangeAt: nowIso
    }
    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
    setVehicles(newVehicles)
    addToHistory(updatedVehicle, 'Retirada', data.driver, data.km, data.obs || '', newVehicles, {
      location: data.location || undefined,
      photos: data.photos,
      customChecklistData: data.customChecklistData
    })
    setWithdrawModal(false); setSelectedVehicle(null)
  }

  const handleReturnConfirm = (data: { km: number; fuel: string; fuelPercent: number; location: string; locationSpecify: string; obs: string; coords: GeoPoint | null }) => {
    if (!selectedVehicle) return
    const location = data.location === 'Outros' ? data.locationSpecify : data.location
    const updatedVehicle: Vehicle = {
      ...selectedVehicle, status: 'disp', driver: '', km: data.km, fuel: data.fuelPercent,
      fuelText: data.fuel, lastLocation: location, obs: data.obs, lastStatusChangeAt: new Date().toISOString()
    }
    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
    const withdrawal = findLastWithdrawal(`${updatedVehicle.tag} (${updatedVehicle.plate})`, history)
    let distanceKm: number | undefined
    let travelTimeMinutes: number | undefined
    if (withdrawal?.location && data.coords) {
      distanceKm = haversineKm(withdrawal.location, data.coords)
      travelTimeMinutes = Math.max(0, (Date.now() - parseDateTime(withdrawal.date).getTime()) / 60000)
    }
    setVehicles(newVehicles)
    addToHistory(updatedVehicle, 'Devolucao', '', data.km, data.obs || location, newVehicles, {
      location: data.coords || undefined, distanceKm, travelTimeMinutes
    })
    setReturnModal(false); setSelectedVehicle(null)
  }

  const handleServiceConfirm = (data: { driver: string; km: number; obs: string }) => {
    if (!selectedVehicle) return
    const nowIso = new Date().toISOString()
    const updatedVehicle: Vehicle = {
      ...selectedVehicle, status: serviceType, driver: data.driver, km: data.km, obs: data.obs,
      lastStatusChangeAt: nowIso,
      lastWashedAt: serviceType === 'lav' ? nowIso : selectedVehicle.lastWashedAt
    }
    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
    setVehicles(newVehicles)
    addToHistory(updatedVehicle, serviceType === 'man' ? 'Envio Manutencao' : 'Envio Lavador', data.driver, data.km, data.obs, newVehicles)
    setServiceModal(false); setSelectedVehicle(null)
  }

  const handleManageSave = (data: Partial<Vehicle>) => {
    if (!selectedVehicle) return
    const updatedVehicle = { ...selectedVehicle, ...data, lastStatusChangeAt: new Date().toISOString() } as Vehicle
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

  const handleCreateRegional = (data: { name: string; code: string; description: string }) => {
    createRegional(data, (seedVehicle) => {
      const newVehicles = [...vehicles, seedVehicle]
      setVehicles(newVehicles)
      saveData(newVehicles, history)
    })
  }

  if (!authChecked) return <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }} />

  if (!appEntered) {
    return (
      <LoginScreen
        currentLang={currentLang}
        error={loginPinError}
        onEnterCommon={enterCommon}
        onEnterAdmin={enterAdmin}
        canInstall={canInstall}
        onInstall={promptInstall}
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
        isAdmin={isAdmin}
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

        {currentPage === 'metrics' && (
          <MetricsPage vehicles={vehicles} history={history} currentLang={currentLang} />
        )}

        {currentPage === 'forum' && (
          <ForumPage
            posts={forumPosts}
            isAdmin={isAdmin}
            onAddPost={addForumPost}
            onAddComment={addForumComment}
            onLikePost={likeForumPost}
          />
        )}

        {currentPage === 'regionais' && (
          <RegionaisPage
            regionais={regionais}
            gerencias={gerencias}
            vehicles={vehicles}
            isAdmin={isAdmin}
            onCreateRegional={handleCreateRegional}
            onCreateGerencia={createGerencia}
          />
        )}

        {currentPage === 'admin' && isAdmin && (
          <AdminPage
            vehicles={vehicles}
            drivers={drivers}
            currentLang={currentLang}
            checklistFields={checklistFields}
            onManage={openManageModal}
            onAddVehicle={() => setAddModal(true)}
            onSaveDrivers={saveDrivers}
            onSaveChecklistFields={saveChecklistFields}
          />
        )}

        {currentPage === 'drivers' && (
          <div style={{ padding: '25px', maxWidth: '1400px', margin: '0 auto' }}>
            <h1 className="page-title">{t('driversTitle', currentLang)}</h1>
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
              <button onClick={downloadPDF} style={{ backgroundColor: 'var(--brand-primary)', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginTop: '15px', width: '100%' }}>
                📄 {t('btnDownloadHistory', currentLang)}
              </button>
            </div>
          </div>
        )}

        {currentPage === 'settings' && (
          <div style={{ padding: '25px', maxWidth: '1400px', margin: '0 auto' }}>
            <h1 className="page-title">{t('settingsTitle', currentLang)}</h1>
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
              {canInstall && (
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                  <div>
                    <h3 style={{ marginBottom: '5px' }}>{t('setInstallApp', currentLang)}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('setInstallAppDesc', currentLang)}</p>
                  </div>
                  <button onClick={promptInstall} style={{ padding: '8px 16px', borderRadius: '5px', border: 'none', background: 'var(--brand-secondary)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                    {t('btnInstallApp', currentLang)}
                  </button>
                </div>
              )}
              <div style={{ padding: '20px', borderTop: '1px solid var(--border)' }}>
                <button onClick={logout} style={{ padding: '10px 16px', borderRadius: '5px', border: 'none', background: 'var(--brand-gray)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                  {t('btnLogout', currentLang)}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <HistoryPanel isOpen={historyPanelOpen} onClose={() => setHistoryPanelOpen(false)} history={history} currentLang={currentLang} onDownloadPdf={downloadPDF} />

      <WithdrawModal
        isOpen={withdrawModal}
        onClose={() => setWithdrawModal(false)}
        vehicle={selectedVehicle}
        currentLang={currentLang}
        drivers={drivers}
        checklistFields={checklistFields}
        onConfirm={handleWithdrawConfirm}
      />
      <ServiceModal isOpen={serviceModal} onClose={() => setServiceModal(false)} vehicle={selectedVehicle} serviceType={serviceType} currentLang={currentLang} onConfirm={handleServiceConfirm} />
      <ReturnModal isOpen={returnModal} onClose={() => setReturnModal(false)} vehicle={selectedVehicle} currentLang={currentLang} onConfirm={handleReturnConfirm} />
      <ManageModal isOpen={manageModal} onClose={() => setManageModal(false)} vehicle={selectedVehicle} currentLang={currentLang} isAdmin={isAdmin} onSave={handleManageSave} onDelete={deleteVehicle} onRequestPin={requestPin} onBlock={blockVehicle} onUnblock={unblockVehicle} />
      <AddModal isOpen={addModal} onClose={() => setAddModal(false)} currentLang={currentLang} onAdd={handleAddVehicle} />
      <PinModal isOpen={pinModal} onClose={() => { setPinModal(false); setPendingAction(null); setPinError(false) }} currentLang={currentLang} error={pinError} onVerify={verifyPin} />
    </div>
  )
}
