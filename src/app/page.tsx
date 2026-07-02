'use client'

import { useState, useEffect } from 'react'

import { Vehicle, PageType, FilterType } from '@/types'
import translations from '@/lib/translations.json'
import { getFuelPercent, calculateDriverKm, getDriverStats, generateVehicleId } from '@/lib/helpers'
import { useFleetData } from '@/lib/hooks/useFleetData'
import { generateFleetReport } from '@/lib/pdf'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import DashboardPage from '@/components/dashboard/DashboardPage'

const t = (key: string, lang: string): string => {
  const translationsData = translations as Record<string, Record<string, string>>
  return translationsData[key]?.[lang] || translationsData[key]?.['pt'] || key
}

const BLOCKED_COLOR = { bg: 'rgba(255, 20, 147, 0.2)', border: '#ff1493', text: '#ff1493' } // Vermelho neon

export default function FrotaInfratech() {
  const { vehicles, setVehicles, history, loading, saveData, addToHistory } = useFleetData()
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all')
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentLang, setCurrentLang] = useState('pt')
  const [theme, setTheme] = useState('light')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')

  const [withdrawModal, setWithdrawModal] = useState(false)
  const [returnModal, setReturnModal] = useState(false)
  const [serviceModal, setServiceModal] = useState(false)
  const [manageModal, setManageModal] = useState(false)
  const [addModal, setAddModal] = useState(false)
  const [pinModal, setPinModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [serviceType, setServiceType] = useState<'man' | 'lav'>('man')
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [pendingVehicleData, setPendingVehicleData] = useState<Partial<Vehicle> | null>(null)

  const [withdrawDriver, setWithdrawDriver] = useState('')
  const [withdrawKm, setWithdrawKm] = useState('')
  const [withdrawFuel, setWithdrawFuel] = useState('Reserva')
  const [withdrawObs, setWithdrawObs] = useState('')
  const [checkProntos, setCheckProntos] = useState(false)

  const [returnKm, setReturnKm] = useState('')
  const [returnFuel, setReturnFuel] = useState('Reserva')
  const [returnLocation, setReturnLocation] = useState('')
  const [returnLocationSpecify, setReturnLocationSpecify] = useState('')
  const [returnObs, setReturnObs] = useState('')

  const [serviceDriver, setServiceDriver] = useState('')
  const [serviceKm, setServiceKm] = useState('')
  const [serviceObs, setServiceObs] = useState('')

  const [manageTag, setManageTag] = useState('')
  const [managePlate, setManagePlate] = useState('')
  const [manageModel, setManageModel] = useState('')
  const [manageStatus, setManageStatus] = useState<Vehicle['status']>('disp')
  const [manageDriver, setManageDriver] = useState('')
  const [manageKm, setManageKm] = useState('')
  const [manageFuel, setManageFuel] = useState('Reserva')
  const [manageMaintenance, setManageMaintenance] = useState('')
  const [manageObs, setManageObs] = useState('')
  const [manageBlocked, setManageBlocked] = useState(false)
  const [manageBlockedReason, setManageBlockedReason] = useState('')
  const [newBlockReason, setNewBlockReason] = useState('')

  const [addTag, setAddTag] = useState('')
  const [addPlate, setAddPlate] = useState('')
  const [addModel, setAddModel] = useState('')
  const [addStatus, setAddStatus] = useState<Vehicle['status']>('disp')
  const [addKm, setAddKm] = useState('0')
  const [addFuel, setAddFuel] = useState('Reserva')
  const [addMaintenance, setAddMaintenance] = useState('')

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- restaura preferências do localStorage após a montagem; o HTML estático é pré-renderizado sem acesso ao localStorage, então isso precisa acontecer no cliente, depois do primeiro paint */
    const storedLang = localStorage.getItem('frota_lang')
    const storedTheme = localStorage.getItem('theme')
    const storedAdmin = localStorage.getItem('isAdmin')

    if (storedLang) setCurrentLang(storedLang)
    if (storedTheme) setTheme(storedTheme)
    if (storedAdmin === 'true') setIsAdmin(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const changeLanguage = (lang: string) => { setCurrentLang(lang); localStorage.setItem('frota_lang', lang) }
  const toggleAdmin = () => {
    if (isAdmin) { setIsAdmin(false); localStorage.removeItem('isAdmin') }
    else { setPendingAction('login'); setPinModal(true) }
  }

  const verifyPin = async () => {
    // Get valid PINs from environment variables (for static deployment)
    const validPins = [
      process.env.NEXT_PUBLIC_ADMIN_PIN_1,
      process.env.NEXT_PUBLIC_ADMIN_PIN_2,
      process.env.NEXT_PUBLIC_ADMIN_PIN_3
    ].filter(Boolean)

    // Check if PIN is valid
    const isValid = validPins.includes(pinInput)

    if (isValid) {
      setPinError(false); setPinModal(false); setPinInput('')
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
    setVehicles(newVehicles); saveData(newVehicles, history); setAddModal(false); resetAddForm()
  }

  const resetWithdrawForm = () => { setWithdrawDriver(''); setWithdrawKm(''); setWithdrawFuel('Reserva'); setWithdrawObs(''); setCheckProntos(false) }
  const resetReturnForm = () => { setReturnKm(''); setReturnFuel('Reserva'); setReturnLocation(''); setReturnLocationSpecify(''); setReturnObs('') }
  const resetServiceForm = () => { setServiceDriver(''); setServiceKm(''); setServiceObs('') }
  const resetAddForm = () => { setAddTag(''); setAddPlate(''); setAddModel(''); setAddStatus('disp'); setAddKm('0'); setAddFuel('Reserva'); setAddMaintenance('') }

  const openWithdrawModal = (vehicle: Vehicle) => { setSelectedVehicle(vehicle); resetWithdrawForm(); setWithdrawModal(true) }
  const openReturnModal = (vehicle: Vehicle) => { setSelectedVehicle(vehicle); resetReturnForm(); setReturnModal(true) }
  const openServiceModal = (type: 'man' | 'lav', vehicle: Vehicle) => { setSelectedVehicle(vehicle); setServiceType(type); setServiceKm(vehicle.km.toString()); resetServiceForm(); setServiceModal(true) }
  const openManageModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle); setManageTag(vehicle.tag); setManagePlate(vehicle.plate); setManageModel(vehicle.model)
    setManageStatus(vehicle.status); setManageDriver(vehicle.driver || ''); setManageKm(vehicle.km.toString())
    setManageFuel(vehicle.fuelText); setManageMaintenance(vehicle.maintenance?.toString() || ''); setManageObs(vehicle.obs || '')
    setManageBlocked(vehicle.blocked || false); setManageBlockedReason(vehicle.blockedReason || ''); setManageModal(true)
  }

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedVehicle) return
    const km = parseInt(withdrawKm); if (km < selectedVehicle.km) return
    const updatedVehicle: Vehicle = { ...selectedVehicle, status: 'uso', driver: withdrawDriver, km, fuel: getFuelPercent(withdrawFuel), fuelText: withdrawFuel, obs: withdrawObs }
    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
    setVehicles(newVehicles); addToHistory(updatedVehicle, 'Retirada', withdrawDriver, km, '', newVehicles); setWithdrawModal(false); setSelectedVehicle(null)
  }

  const handleReturn = (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedVehicle) return
    const km = parseInt(returnKm); let location = returnLocation; if (location === 'Outros') location = returnLocationSpecify
    const updatedVehicle: Vehicle = { ...selectedVehicle, status: 'disp', driver: '', km, fuel: getFuelPercent(returnFuel), fuelText: returnFuel, lastLocation: location, obs: returnObs }
    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
    setVehicles(newVehicles); addToHistory(updatedVehicle, 'Devolucao', '', km, location, newVehicles); setReturnModal(false); setSelectedVehicle(null)
  }

  const handleService = (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedVehicle) return
    const km = parseInt(serviceKm)
    const updatedVehicle: Vehicle = { ...selectedVehicle, status: serviceType, driver: serviceDriver, km, obs: serviceObs }
    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
    setVehicles(newVehicles); addToHistory(updatedVehicle, serviceType === 'man' ? 'Envio Manutencao' : 'Envio Lavador', serviceDriver, km, serviceObs, newVehicles)
    setServiceModal(false); setSelectedVehicle(null)
  }

  const handleManage = (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedVehicle) return
    const maintenanceValue = isAdmin ? parseInt(manageMaintenance) || 0 : selectedVehicle.maintenance
    const updatedVehicle: Vehicle = {
      ...selectedVehicle, tag: manageTag, plate: managePlate, model: manageModel, status: manageStatus, driver: manageDriver,
      km: parseInt(manageKm), fuel: getFuelPercent(manageFuel), fuelText: manageFuel, maintenance: maintenanceValue, obs: manageObs,
      blocked: manageBlocked, blockedReason: manageBlockedReason
    }
    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
    setVehicles(newVehicles); saveData(newVehicles, history); setManageModal(false); setSelectedVehicle(null)
  }

  const blockVehicle = (reason: string) => {
    if (!selectedVehicle) return
    const updatedVehicle: Vehicle = { ...selectedVehicle, blocked: true, blockedReason: reason, blockedBy: isAdmin ? 'Admin' : 'Usuario', blockedAt: new Date().toLocaleDateString('pt-BR') }
    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
    setVehicles(newVehicles); saveData(newVehicles, history); setManageBlocked(true); setManageBlockedReason(reason); setShowBlockModal(false); setNewBlockReason('')
  }

  const unblockVehicle = () => {
    if (!selectedVehicle) return
    if (!isAdmin) { setPendingAction('unblock'); setPinModal(true); return }
    const updatedVehicle: Vehicle = { ...selectedVehicle, blocked: false, blockedReason: '', blockedBy: '', blockedAt: '' }
    const newVehicles = vehicles.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
    setVehicles(newVehicles); saveData(newVehicles, history); setManageBlocked(false); setManageBlockedReason('')
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const newVehicleData: Partial<Vehicle> = { tag: addTag, plate: addPlate, model: addModel, status: addStatus, km: parseInt(addKm) || 0, fuel: getFuelPercent(addFuel), fuelText: addFuel, maintenance: parseInt(addMaintenance) || 0 }
    if (!isAdmin) { setPendingAction('add'); setPendingVehicleData(newVehicleData); setPinModal(true); setAddModal(false) }
    else addNewVehicle(newVehicleData)
  }

  const confirmDelete = () => { setPendingAction('delete'); setManageModal(false); setPinModal(true) }

  const downloadPDF = () => generateFleetReport(vehicles, history)

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
          theme={theme}
          isAdmin={isAdmin}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onLanguageChange={changeLanguage}
          onToggleTheme={toggleTheme}
          onToggleAdmin={toggleAdmin}
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
                  <div key={driver[0]} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', marginBottom: '8px', backgroundColor: 'var(--bg-main)', borderRadius: '8px', borderLeft: '4px solid #009688' }}>
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
            </div>
          </div>
        )}
      </main>

      {/* History Panel */}
      {historyPanelOpen && (
        <div style={{ position: 'fixed', right: 0, top: 0, width: '600px', maxWidth: '90%', height: '100vh', backgroundColor: 'var(--bg-card)', boxShadow: '-5px 0 20px rgba(0,0,0,0.2)', zIndex: 1500, overflowY: 'auto' }}>
          <div style={{ padding: '20px', background: 'linear-gradient(135deg, #009688, #00796b)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }}>
            <h2>📜 {t('historyTitle', currentLang)}</h2>
            <button onClick={() => setHistoryPanelOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
          </div>
          <div style={{ padding: '20px' }}>
            <button onClick={downloadPDF} style={{ backgroundColor: '#e74c3c', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginTop: '15px', width: '100%' }}>
              📥 {t('btnDownload', currentLang)}
            </button>
            <h3 style={{ marginBottom: '15px', marginTop: '20px' }}>{t('allMovements', currentLang)}</h3>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                <thead><tr>
                  <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontWeight: 600, fontSize: '0.85rem' }}>{t('thDate', currentLang)}</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontWeight: 600, fontSize: '0.85rem' }}>{t('thVehicle', currentLang)}</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontWeight: 600, fontSize: '0.85rem' }}>{t('thDriver', currentLang)}</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontWeight: 600, fontSize: '0.85rem' }}>{t('thAction', currentLang)}</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontWeight: 600, fontSize: '0.85rem' }}>{t('thKM', currentLang)}</th>
                </tr></thead>
                <tbody>
                  {[...history].reverse().slice(0, 50).map((h, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 8px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h.date}</td>
                      <td style={{ padding: '12px 8px', fontSize: '0.85rem' }}>{h.vehicle}</td>
                      <td style={{ padding: '12px 8px', fontSize: '0.85rem' }}>{h.driver || '-'}</td>
                      <td style={{ padding: '12px 8px', fontSize: '0.85rem' }}>{h.action}</td>
                      <td style={{ padding: '12px 8px', fontSize: '0.85rem' }}>{h.km.toLocaleString()} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {withdrawModal && selectedVehicle && (
        <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { if (e.target === e.currentTarget) setWithdrawModal(false) }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>🔑 {t('modalWithdraw', currentLang)}</h2>
              <button onClick={() => setWithdrawModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              <form onSubmit={handleWithdraw}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblVehicle', currentLang)}</label>
                  <input type="text" value={`${selectedVehicle.tag} - ${selectedVehicle.model}`} disabled style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)', opacity: 0.7 }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblDriver', currentLang)}</label>
                  <input type="text" value={withdrawDriver} onChange={(e) => setWithdrawDriver(e.target.value)} required style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblKm', currentLang)}</label>
                  <input type="number" value={withdrawKm} onChange={(e) => setWithdrawKm(e.target.value)} min={selectedVehicle.km} required style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                  {parseInt(withdrawKm) < selectedVehicle.km && <small style={{ color: '#e74c3c' }}>{t('errorKm', currentLang)}</small>}
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblFuel', currentLang)}</label>
                  <select value={withdrawFuel} onChange={(e) => setWithdrawFuel(e.target.value)} required style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                    <option value="Reserva">Reserva</option><option value="1/4">1/4</option><option value="2/4">2/4</option><option value="3/4">3/4</option><option value="Cheio">Cheio</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', backgroundColor: 'rgba(0, 150, 136, 0.1)', borderRadius: '8px', border: '2px solid #009688', marginBottom: '20px' }}>
                  <input type="checkbox" id="checkProntos" checked={checkProntos} onChange={(e) => setCheckProntos(e.target.checked)} style={{ width: '20px', height: '20px' }} />
                  <label htmlFor="checkProntos">{t('lblProntos', currentLang)}</label>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblObs', currentLang)}</label>
                  <textarea value={withdrawObs} onChange={(e) => setWithdrawObs(e.target.value)} rows={3} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)', resize: 'vertical' }} />
                </div>
                <button type="submit" disabled={!checkProntos} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, backgroundColor: checkProntos ? '#3498db' : '#ccc', color: 'white' }}>
                  ✅ {t('btnConfirm', currentLang)}
                </button>
                <button type="button" onClick={() => setWithdrawModal(false)} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, backgroundColor: '#34495e', color: 'white', marginTop: '10px' }}>
                  {t('btnCancel', currentLang)}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {serviceModal && selectedVehicle && (
        <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { if (e.target === e.currentTarget) setServiceModal(false) }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{serviceType === 'man' ? '🔧 ' + t('serviceTitleMaint', currentLang) : '🧹 ' + t('serviceTitleWash', currentLang)}</h2>
              <button onClick={() => setServiceModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              <form onSubmit={handleService}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblVehicle', currentLang)}</label>
                  <input type="text" value={`${selectedVehicle.tag} - ${selectedVehicle.model}`} disabled style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)', opacity: 0.7 }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblDriver', currentLang)}</label>
                  <input type="text" value={serviceDriver} onChange={(e) => setServiceDriver(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblKm', currentLang)}</label>
                  <input type="number" value={serviceKm} onChange={(e) => setServiceKm(e.target.value)} required style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblObs', currentLang)}</label>
                  <textarea value={serviceObs} onChange={(e) => setServiceObs(e.target.value)} rows={3} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)', resize: 'vertical' }} />
                </div>
                <button type="submit" style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, backgroundColor: serviceType === 'man' ? '#f39c12' : '#3498db', color: 'white' }}>
                  ✅ {t('btnConfirmService', currentLang)}
                </button>
                <button type="button" onClick={() => setServiceModal(false)} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, backgroundColor: '#34495e', color: 'white', marginTop: '10px' }}>
                  {t('btnCancel', currentLang)}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModal && selectedVehicle && (
        <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { if (e.target === e.currentTarget) setReturnModal(false) }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>↩️ {t('modalReturn', currentLang)}</h2>
              <button onClick={() => setReturnModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              <form onSubmit={handleReturn}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblVehicle', currentLang)}</label>
                  <input type="text" value={`${selectedVehicle.tag} - ${selectedVehicle.model}`} disabled style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)', opacity: 0.7 }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblDriver', currentLang)}</label>
                  <input type="text" value={selectedVehicle.driver} disabled style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)', opacity: 0.7 }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblKm', currentLang)}</label>
                  <input type="number" value={returnKm} onChange={(e) => setReturnKm(e.target.value)} min={selectedVehicle.km} required style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblFuel', currentLang)}</label>
                  <select value={returnFuel} onChange={(e) => setReturnFuel(e.target.value)} required style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                    <option value="Reserva">Reserva</option><option value="1/4">1/4</option><option value="2/4">2/4</option><option value="3/4">3/4</option><option value="Cheio">Cheio</option>
                  </select>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblLocation', currentLang)}</label>
                  <select value={returnLocation} onChange={(e) => setReturnLocation(e.target.value)} required style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                    <option value="">Selecione...</option><option value="Parauapebas">Parauapebas</option><option value="Praca da Bandeira">Praca da Bandeira</option><option value="CCO">CCO</option><option value="Cafeteira">Cafeteira</option><option value="Nucleo">Nucleo</option><option value="Helio Grace">Helio Grace</option><option value="Infratech">Infratech</option><option value="Oficina Centralizada">Oficina Centralizada</option><option value="Lavador">Lavador</option><option value="Meio Ambiente">Meio Ambiente</option><option value="Outros">Outros</option>
                  </select>
                </div>
                {returnLocation === 'Outros' && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblSpecify', currentLang)}</label>
                    <input type="text" value={returnLocationSpecify} onChange={(e) => setReturnLocationSpecify(e.target.value)} required style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                  </div>
                )}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblObs', currentLang)}</label>
                  <textarea value={returnObs} onChange={(e) => setReturnObs(e.target.value)} rows={3} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)', resize: 'vertical' }} />
                </div>
                <button type="submit" style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, backgroundColor: '#9b59b6', color: 'white' }}>
                  ✅ {t('btnConfirmReturn', currentLang)}
                </button>
                <button type="button" onClick={() => setReturnModal(false)} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, backgroundColor: '#34495e', color: 'white', marginTop: '10px' }}>
                  {t('btnCancel', currentLang)}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manage Modal */}
      {manageModal && selectedVehicle && (
        <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { if (e.target === e.currentTarget) setManageModal(false) }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>✏️ {t('modalManage', currentLang)}</h2>
              <button onClick={() => setManageModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              {(manageBlocked || selectedVehicle.blocked) && (
                <div style={{ backgroundColor: BLOCKED_COLOR.bg, border: `2px solid ${BLOCKED_COLOR.border}`, borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                  <div style={{ color: BLOCKED_COLOR.text, fontWeight: 700, marginBottom: '5px' }}>🚫 {t('vehicleBlocked', currentLang)}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}><strong>{currentLang === 'pt' ? 'Motivo:' : currentLang === 'en' ? 'Reason:' : 'Motivo:'}</strong> {selectedVehicle.blockedReason || manageBlockedReason || (currentLang === 'pt' ? 'Não especificado' : currentLang === 'en' ? 'Not specified' : 'No especificado')}</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                {!manageBlocked && !selectedVehicle.blocked ? (
                  <button type="button" onClick={() => setShowBlockModal(true)} style={{ padding: '12px 20px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', backgroundColor: '#e67e22', color: 'white' }}>
                    🚫 {currentLang === 'pt' ? 'Bloquear Veículo' : currentLang === 'en' ? 'Block Vehicle' : 'Bloquear Vehículo'}
                  </button>
                ) : (
                  <button type="button" onClick={unblockVehicle} style={{ padding: '12px 20px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', backgroundColor: '#27ae60', color: 'white' }}>
                    🔓 {currentLang === 'pt' ? 'Desbloquear Veículo' : currentLang === 'en' ? 'Unblock Vehicle' : 'Desbloquear Vehículo'}
                    {!isAdmin && <span style={{ backgroundColor: '#f39c12', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', marginLeft: '8px' }}>{t('adminOnly', currentLang).toUpperCase()}</span>}
                  </button>
                )}
              </div>

              <form onSubmit={handleManage}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblTag', currentLang)}</label>
                    <input type="text" value={manageTag} onChange={(e) => setManageTag(e.target.value)} required style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblPlate', currentLang)}</label>
                    <input type="text" value={managePlate} onChange={(e) => setManagePlate(e.target.value)} required style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                  </div>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblModel', currentLang)}</label>
                  <input type="text" value={manageModel} onChange={(e) => setManageModel(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblStatus', currentLang)}</label>
                    <select value={manageStatus} onChange={(e) => setManageStatus(e.target.value as Vehicle['status'])} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} disabled={manageBlocked || selectedVehicle.blocked}>
                      <option value="disp">Disponível</option><option value="uso">Em Uso</option><option value="lav">Lavador</option><option value="man">Manutenção</option><option value="mobilizacao">Em Mobilização</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblDriver', currentLang)}</label>
                    <input type="text" value={manageDriver} onChange={(e) => setManageDriver(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblKm', currentLang)}</label>
                    <input type="number" value={manageKm} onChange={(e) => setManageKm(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblFuel', currentLang)}</label>
                    <select value={manageFuel} onChange={(e) => setManageFuel(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                      <option value="Reserva">Reserva</option><option value="1/4">1/4</option><option value="2/4">2/4</option><option value="3/4">3/4</option><option value="Cheio">Cheio</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    {t('lblNextMaint', currentLang)}
                    {!isAdmin && <span style={{ backgroundColor: '#f39c12', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', marginLeft: '8px' }}>APENAS ADMIN</span>}
                  </label>
                  <input type="number" value={manageMaintenance} onChange={(e) => isAdmin && setManageMaintenance(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: !isAdmin ? '#f5f5f5' : 'var(--bg-card)', cursor: !isAdmin ? 'not-allowed' : 'pointer' }} readOnly={!isAdmin} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblObs', currentLang)}</label>
                  <textarea value={manageObs} onChange={(e) => setManageObs(e.target.value)} rows={3} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)', resize: 'vertical' }} />
                </div>
                <button type="submit" style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, backgroundColor: '#34495e', color: 'white' }}>
                  💾 {t('btnSave', currentLang)}
                </button>
                {isAdmin && (
                  <button type="button" onClick={confirmDelete} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, backgroundColor: '#e74c3c', color: 'white', marginTop: '10px' }}>
                    🗑️ {t('btnDelete', currentLang)}
                  </button>
                )}
                <button type="button" onClick={() => setManageModal(false)} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, backgroundColor: '#95a5a6', color: 'white', marginTop: '10px' }}>
                  {t('btnCancel', currentLang)}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {showBlockModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }} onClick={(e) => { if (e.target === e.currentTarget) { setShowBlockModal(false); setNewBlockReason('') } }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '25px', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '15px', color: '#e74c3c' }}>⚠️ {currentLang === 'pt' ? 'Bloquear Veículo' : currentLang === 'en' ? 'Block Vehicle' : 'Bloquear Vehículo'}</h3>
            <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>{currentLang === 'pt' ? 'Informe o motivo do bloqueio.' : currentLang === 'en' ? 'Enter the reason for blocking.' : 'Ingrese el motivo del bloqueo.'}</p>
            <textarea value={newBlockReason} onChange={(e) => setNewBlockReason(e.target.value)} placeholder={currentLang === 'pt' ? 'Motivo do bloqueio...' : currentLang === 'en' ? 'Reason for blocking...' : 'Motivo del bloqueo...'} style={{ width: '100%', padding: '12px', border: '2px solid #e74c3c', borderRadius: '8px', minHeight: '100px', marginBottom: '15px', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }} autoFocus />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowBlockModal(false); setNewBlockReason('') }} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, backgroundColor: '#95a5a6', color: 'white' }}>{t('btnCancel', currentLang)}</button>
              <button onClick={() => blockVehicle(newBlockReason)} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, backgroundColor: '#e67e22', color: 'white' }} disabled={!newBlockReason.trim()}>{currentLang === 'pt' ? 'Confirmar' : currentLang === 'en' ? 'Confirm' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {addModal && (
        <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { if (e.target === e.currentTarget) setAddModal(false) }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>➕ {t('modalAdd', currentLang)}</h2>
              <button onClick={() => setAddModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              <form onSubmit={handleAdd}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblTag', currentLang)}</label>
                    <input type="text" value={addTag} onChange={(e) => setAddTag(e.target.value)} required style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblPlate', currentLang)}</label>
                    <input type="text" value={addPlate} onChange={(e) => setAddPlate(e.target.value)} required style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                  </div>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblModel', currentLang)}</label>
                  <input type="text" value={addModel} onChange={(e) => setAddModel(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblStatus', currentLang)}</label>
                    <select value={addStatus} onChange={(e) => setAddStatus(e.target.value as Vehicle['status'])} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                      <option value="disp">Disponível</option><option value="uso">Em Uso</option><option value="lav">Lavador</option><option value="man">Manutenção</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblKm', currentLang)}</label>
                    <input type="number" value={addKm} onChange={(e) => setAddKm(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblFuel', currentLang)}</label>
                    <select value={addFuel} onChange={(e) => setAddFuel(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                      <option value="Reserva">Reserva</option><option value="1/4">1/4</option><option value="2/4">2/4</option><option value="3/4">3/4</option><option value="Cheio">Cheio</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('lblNextMaint', currentLang)}</label>
                    <input type="number" value={addMaintenance} onChange={(e) => setAddMaintenance(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }} />
                  </div>
                </div>
                <button type="submit" style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, backgroundColor: '#009688', color: 'white' }}>
                  ➕ {t('btnAdd', currentLang)}
                </button>
                <button type="button" onClick={() => setAddModal(false)} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, backgroundColor: '#34495e', color: 'white', marginTop: '10px' }}>
                  {t('btnCancel', currentLang)}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Pin Modal */}
      {pinModal && (
        <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { if (e.target === e.currentTarget) { setPinModal(false); setPendingAction(null); setPinError(false); setPinInput('') } }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', width: '90%', maxWidth: '400px', padding: '20px' }}>
            <h2 style={{ marginBottom: '15px' }}>🔐 {t('modalAdmin', currentLang)}</h2>
            <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>{t('pinMsg', currentLang)}</p>
            <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)', marginBottom: '10px' }} autoFocus onKeyDown={(e) => e.key === 'Enter' && verifyPin()} />
            {pinError && <p style={{ color: '#e74c3c', marginBottom: '10px' }}>{t('pinError', currentLang)}</p>}
            <button onClick={verifyPin} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, backgroundColor: '#009688', color: 'white' }}>
              {t('btnEnter', currentLang)}
            </button>
            <button onClick={() => { setPinModal(false); setPendingAction(null); setPinError(false); setPinInput('') }} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 600, backgroundColor: '#34495e', color: 'white', marginTop: '10px' }}>
              {t('btnCancel', currentLang)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
