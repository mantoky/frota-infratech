'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/firebase'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { Vehicle, HistoryItem, PageType } from '@/types'
import translations from '@/lib/translations.json'
import { initialVehicles } from '@/lib/constants'
import { getFuelPercent, calculateDriverKm, getDriverStats, getDriverKmDetails } from '@/lib/helpers'

const t = (key: string, lang: string): string => {
  const translationsData = translations as Record<string, Record<string, string>>
  return translationsData[key]?.[lang] || translationsData[key]?.['pt'] || key
}

// Cores dos status
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  disp: { bg: 'rgba(39, 174, 96, 0.15)', border: '#27ae60', text: '#27ae60' },
  uso: { bg: 'rgba(52, 152, 219, 0.15)', border: '#3498db', text: '#3498db' },
  lav: { bg: 'rgba(241, 196, 15, 0.15)', border: '#f1c40f', text: '#d4a00a' },
  man: { bg: 'rgba(231, 76, 60, 0.15)', border: '#e74c3c', text: '#e74c3c' },
  mobilizacao: { bg: 'rgba(155, 89, 182, 0.15)', border: '#9b59b6', text: '#9b59b6' }
}

const BLOCKED_COLOR = { bg: 'rgba(255, 20, 147, 0.2)', border: '#ff1493', text: '#ff1493' } // Vermelho neon

// Ícones de veículos baseados no modelo
const getVehicleIcon = (model: string): string => {
  const m = model.toLowerCase()
  if (m.includes('hilux') || m.includes('pickup') || m.includes('caminhonete')) return '🛻'
  if (m.includes('s10') || m.includes('silverado')) return '🛻'
  if (m.includes('ranger') || m.includes('pickup')) return '🛻'
  if (m.includes('nivus') || m.includes('suv') || m.includes('crossover')) return '🚙'
  if (m.includes('van') || m.includes('transporter') || m.includes('kombi')) return '🚐'
  if (m.includes('onibus') || m.includes('bus')) return '🚌'
  return '🚗' // Padrão para carros
}

export default function FrotaInfratech() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [currentFilter, setCurrentFilter] = useState<string>('all')
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentLang, setCurrentLang] = useState('pt')
  const [theme, setTheme] = useState('light')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')
  const [loading, setLoading] = useState(true)

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
    const storedLang = localStorage.getItem('frota_lang')
    const storedTheme = localStorage.getItem('theme')
    const storedAdmin = localStorage.getItem('isAdmin')

    if (storedLang) setCurrentLang(storedLang)
    if (storedTheme) setTheme(storedTheme)
    if (storedAdmin === 'true') setIsAdmin(true)

    const localBackup = localStorage.getItem('frota_backup')
    if (localBackup) {
      try {
        const backup = JSON.parse(localBackup)
        if (backup.vehicles) setVehicles(backup.vehicles)
        if (backup.history) setHistory(backup.history)
      } catch (e) {
        console.error('Error loading local backup:', e)
      }
    }

    const unsub = onSnapshot(doc(db, 'frota', 'data'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        const firestoreVehicles = data.vehicles || []
        const firestoreHistory = data.history || []

        if (firestoreVehicles.length > 0) setVehicles(firestoreVehicles)
        if (firestoreHistory.length > 0 || !localBackup) setHistory(firestoreHistory)

        localStorage.setItem('frota_backup', JSON.stringify({
          vehicles: firestoreVehicles.length > 0 ? firestoreVehicles : vehicles,
          history: firestoreHistory.length > 0 ? firestoreHistory : history,
          backupDate: new Date().toISOString()
        }))
      } else {
        if (!localBackup) {
          setVehicles(initialVehicles)
          setDoc(doc(db, 'frota', 'data'), {
            vehicles: initialVehicles, history: [], createdAt: new Date().toISOString(), version: '2.0'
          }, { merge: true })
        }
      }
      setLoading(false)
    }, (error) => {
      console.error('Error fetching Firestore data:', error)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const saveData = useCallback(async (newVehicles: Vehicle[], newHistory: HistoryItem[]) => {
    try {
      await setDoc(doc(db, 'frota', 'data'), {
        vehicles: newVehicles, history: newHistory, lastUpdated: new Date().toISOString(), version: '2.0'
      }, { merge: true })
      localStorage.setItem('frota_backup', JSON.stringify({
        vehicles: newVehicles, history: newHistory, backupDate: new Date().toISOString()
      }))
    } catch (e) {
      console.error('Error saving data to Firestore', e)
      localStorage.setItem('frota_backup', JSON.stringify({
        vehicles: newVehicles, history: newHistory, backupDate: new Date().toISOString()
      }))
    }
  }, [])

  const addToHistory = useCallback((vehicle: Vehicle, action: string, driver: string, km: number, extra: string = '', currentVehicles: Vehicle[] = vehicles) => {
    const now = new Date()
    const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR')
    const newHistoryItem: HistoryItem = {
      date: dateStr, vehicle: `${vehicle.tag} (${vehicle.plate})`, driver, action, km, extra
    }
    const newHistory = [...history, newHistoryItem]
    setHistory(newHistory)
    saveData(currentVehicles, newHistory)
  }, [history, saveData, vehicles])

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
      id: Date.now(), tag: data.tag || '', plate: data.plate || '', model: data.model || '',
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

  // PDF com detalhes de KM por motorista
  const downloadPDF = () => {
    const doc = new jsPDF()
    let yPos = 20

    doc.setFontSize(22)
    doc.setTextColor(0, 150, 136)
    doc.text('FROTA INFRATECH', 105, yPos, { align: 'center' })
    yPos += 10

    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.text('Relatorio Detalhado de Historico de Veiculos', 105, yPos, { align: 'center' })
    yPos += 8

    doc.setFontSize(10)
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}`, 105, yPos, { align: 'center' })
    yPos += 15

    // Estatísticas por motorista
    const driverStats = getDriverStats(history)
    if (driverStats.length > 0) {
      doc.setFontSize(14)
      doc.setTextColor(0, 150, 136)
      doc.text('ESTATISTICAS POR MOTORISTA (Ultimos 30 dias)', 14, yPos)
      yPos += 8

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Motorista', 'Retiradas', 'KM Rodado', 'Media/Retirada']],
        body: driverStats.map((driver, index) => {
          const totalKm = calculateDriverKm(driver[0], history)
          const avgKm = driver[1] > 0 ? Math.round(totalKm / driver[1]) : 0
          return [index + 1, driver[0], driver[1], `${totalKm.toLocaleString()} km`, `${avgKm.toLocaleString()} km`]
        }),
        theme: 'striped',
        headStyles: { fillColor: [0, 150, 136], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      })
      yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : 80
    }

    // Detalhes de KM por motorista (retirada/devolução)
    doc.addPage()
    yPos = 20
    doc.setFontSize(14)
    doc.setTextColor(0, 150, 136)
    doc.text('DETALHES DE KM POR MOTORISTA', 14, yPos)
    yPos += 10

    const driversWithDetails = driverStats.filter(d => calculateDriverKm(d[0], history) > 0)

    driversWithDetails.forEach(([driverName]) => {
      if (yPos > 250) { doc.addPage(); yPos = 20 }

      doc.setFontSize(11)
      doc.setTextColor(52, 73, 94)
      doc.text(`Motorista: ${driverName}`, 14, yPos)
      yPos += 6

      const details = getDriverKmDetails(driverName, history)
      if (details.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Data', 'Veiculo', 'KM Inicio', 'KM Fim', 'KM Rodado']],
          body: details.map(d => [d.date, d.vehicle, d.kmStart.toLocaleString(), d.kmEnd.toLocaleString(), `${d.kmDriven.toLocaleString()} km`]),
          theme: 'grid',
          headStyles: { fillColor: [52, 73, 94], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        })
        yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : yPos + 30
      }
      yPos += 5
    })

    // Histórico detalhado
    doc.addPage()
    yPos = 20
    doc.setFontSize(14)
    doc.setTextColor(0, 150, 136)
    doc.text('HISTORICO COMPLETO DE MOVIMENTACOES', 14, yPos)
    yPos += 10

    if (history.length > 0) {
      const sortedHistory = [...history].reverse().slice(0, 100)
      autoTable(doc, {
        startY: yPos,
        head: [['Data/Hora', 'Veiculo', 'Motorista', 'Acao', 'KM', 'Extras']],
        body: sortedHistory.map(item => [item.date, item.vehicle, item.driver || '-', item.action, item.km.toLocaleString() + ' km', item.extra || '-']),
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 30 }, 2: { cellWidth: 25 }, 3: { cellWidth: 25 }, 4: { cellWidth: 20 }, 5: { cellWidth: 35 } },
        margin: { left: 14, right: 14 },
      })
    }

    // Resumo da frota
    doc.addPage()
    yPos = 20
    doc.setFontSize(14)
    doc.setTextColor(0, 150, 136)
    doc.text('RESUMO DA FROTA', 14, yPos)
    yPos += 10

    const totalVehicles = vehicles.length
    const stats = [
      ['Total de Veiculos', totalVehicles, '100%'],
      ['Disponiveis', vehicles.filter(v => v.status === 'disp').length],
      ['Em Uso', vehicles.filter(v => v.status === 'uso').length],
      ['Em Manutencao', vehicles.filter(v => v.status === 'man').length],
      ['Em Lavador', vehicles.filter(v => v.status === 'lav').length],
      ['Em Mobilizacao', vehicles.filter(v => v.status === 'mobilizacao').length],
      ['Bloqueados', vehicles.filter(v => v.blocked).length],
    ]

    autoTable(doc, {
      startY: yPos,
      head: [['Status', 'Quantidade', 'Percentual']],
      body: stats.map((s, i) => [s[0], s[1], i === 0 ? '100%' : `${((s[1] as number) / totalVehicles * 100).toFixed(1)}%`]),
      theme: 'striped',
      headStyles: { fillColor: [0, 150, 136] },
      margin: { left: 14, right: 14 },
    })

    // Rodapé
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Frota Infratech - Pagina ${i} de ${pageCount}`, 105, 290, { align: 'center' })
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 295, { align: 'center' })
    }

    doc.save(`relatorio-frota-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Sort vehicles by tag (TN-01, TN-02, etc.)
  const sortedVehicles = [...vehicles].sort((a, b) => {
    // Extract number from tag (e.g., "TN-01" -> 1, "TN-73" -> 73)
    const getTagNumber = (tag: string) => {
      const match = tag.match(/(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    }
    return getTagNumber(a.tag) - getTagNumber(b.tag)
  })
  
  const filteredVehicles = currentFilter === 'all' ? sortedVehicles : sortedVehicles.filter(v => v.status === currentFilter)
  const counts = { all: vehicles.length, disp: vehicles.filter(v => v.status === 'disp').length, uso: vehicles.filter(v => v.status === 'uso').length, lav: vehicles.filter(v => v.status === 'lav').length, man: vehicles.filter(v => v.status === 'man').length }
  const maintenanceAlerts = vehicles.filter(v => { const remaining = v.maintenance - v.km; return remaining >= 0 && remaining <= 1000 })
  const blockedAlerts = vehicles.filter(v => v.blocked)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '3rem' }}>⏳</div><p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Carregando...</p></div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      {/* Sidebar */}
      <aside style={{ position: 'fixed', left: sidebarOpen ? 0 : '-280px', top: 0, height: '100vh', width: 'min(280px, 85vw)', backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-light)', zIndex: 1000, transition: 'left 0.3s ease', overflowY: 'auto' }}>
        <div style={{ padding: '15px', background: 'linear-gradient(135deg, #009688, #00796b)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '60px' }}>
          <span style={{ fontSize: '1.5rem' }}>🚚</span>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{t('sidebarTitle', currentLang)}</h1>
        </div>
        <nav style={{ padding: '20px 0' }}>
          <div style={{ padding: '10px 20px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('menuMain', currentLang)}</div>
          <div style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: currentPage === 'dashboard' ? 'rgba(255,255,255,0.1)' : 'transparent', borderLeft: currentPage === 'dashboard' ? '4px solid #009688' : 'none' }} onClick={() => { setCurrentPage('dashboard'); setSidebarOpen(false) }}>
            <span>📊</span><span>{t('menuDashboard', currentLang)}</span>
          </div>
          <div style={{ padding: '10px 20px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '15px' }}>{t('menuFilters', currentLang)}</div>
          {['disp', 'uso', 'lav', 'man'].map(filter => (
            <div key={filter} style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: currentFilter === filter ? 'rgba(255,255,255,0.1)' : 'transparent', borderLeft: currentFilter === filter ? '4px solid #009688' : 'none' }} onClick={() => { setCurrentFilter(filter); setSidebarOpen(false) }}>
              <span>{filter === 'disp' ? '✅' : filter === 'uso' ? '🚗' : filter === 'lav' ? '🧹' : '🔧'}</span>
              <span>{filter === 'disp' ? t('statAvailable', currentLang) : filter === 'uso' ? t('statInUse', currentLang) : filter === 'lav' ? t('statWash', currentLang) : t('statMaintenance', currentLang)}</span>
            </div>
          ))}
          <div style={{ padding: '10px 20px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '15px' }}>{t('menuReports', currentLang)}</div>
          <div style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: currentPage === 'drivers' ? 'rgba(255,255,255,0.1)' : 'transparent', borderLeft: currentPage === 'drivers' ? '4px solid #009688' : 'none' }} onClick={() => { setCurrentPage('drivers'); setSidebarOpen(false) }}>
            <span>👥</span><span>{t('menuDrivers', currentLang)}</span>
          </div>
          <div style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => { setHistoryPanelOpen(true); setSidebarOpen(false) }}>
            <span>📜</span><span>{t('menuHistory', currentLang)}</span>
          </div>
          <div style={{ padding: '10px 20px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '15px' }}>{t('menuSystem', currentLang)}</div>
          <div style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: currentPage === 'settings' ? 'rgba(255,255,255,0.1)' : 'transparent', borderLeft: currentPage === 'settings' ? '4px solid #009688' : 'none' }} onClick={() => { setCurrentPage('settings'); setSidebarOpen(false) }}>
            <span>⚙️</span><span>{t('menuSettings', currentLang)}</span>
          </div>
        </nav>
      </aside>

      {sidebarOpen && <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }} onClick={() => setSidebarOpen(false)} />}

      <main style={{ marginLeft: 0, minHeight: '100vh' }}>
        {/* Top Bar */}
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '15px 25px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', gap: '10px' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'linear-gradient(135deg, #009688, #00796b)', border: 'none', color: 'white', padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px', height: '45px' }}>
            <span>☰</span><span>Menu</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 15px', background: 'linear-gradient(135deg, #009688, #00796b)', borderRadius: '8px', color: 'white', height: '45px' }}>
            <span style={{ fontSize: '1.3rem' }}>🚚</span>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Frota Infratech</h1>
          </div>
          <div style={{ background: 'linear-gradient(90deg, #f39c12, #e74c3c)', color: 'white', padding: '8px 20px', borderRadius: '20px', fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }}>
            {t('prontosPhrase', currentLang)}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select value={currentLang} onChange={(e) => changeLanguage(e.target.value)} style={{ height: '45px', borderRadius: '25px', border: '2px solid #009688', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', padding: '0 15px' }}>
              <option value="pt">BR PORT</option><option value="en">US ING</option><option value="es">ES ESP</option>
            </select>
            <button onClick={toggleTheme} style={{ background: 'var(--bg-card)', border: '2px solid #009688', color: '#009688', borderRadius: '50%', cursor: 'pointer', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button onClick={toggleAdmin} style={{ background: isAdmin ? '#27ae60' : 'var(--bg-card)', border: `2px solid ${isAdmin ? '#27ae60' : '#009688'}`, color: isAdmin ? 'white' : '#009688', padding: '8px 15px', borderRadius: '25px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', height: '45px' }}>
              <span>👤</span><span>{isAdmin ? t('adminActive', currentLang) : t('adminInactive', currentLang)}</span>
            </button>
            {isAdmin && (
              <button onClick={() => setAddModal(true)} style={{ background: '#009688', border: '2px solid #009688', color: 'white', padding: '8px 15px', borderRadius: '25px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', height: '45px' }}>
                <span>➕</span><span>{t('btnAdd', currentLang)}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dashboard */}
        {currentPage === 'dashboard' && (
          <div style={{ padding: '25px', maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{t('dashboardTitle', currentLang)}</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>{t('dashboardSubtitle', currentLang)}</p>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {maintenanceAlerts.length > 0 && (
                <div style={{ flex: 1, minWidth: '250px', backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '5px solid #e74c3c', fontWeight: 600 }}>
                  <span>⚠️</span><span>{maintenanceAlerts.length} {t('maintenanceAlert', currentLang)}</span>
                </div>
              )}
              {blockedAlerts.length > 0 && (
                <div style={{ flex: 1, minWidth: '250px', backgroundColor: BLOCKED_COLOR.bg, color: BLOCKED_COLOR.text, padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', borderLeft: `5px solid ${BLOCKED_COLOR.border}`, fontWeight: 600 }}>
                  <span>🚫</span><span>{blockedAlerts.length} {currentLang === 'pt' ? 'veículo(s) bloqueado(s)' : currentLang === 'en' ? 'vehicle(s) blocked' : 'vehículo(s) bloqueado(s)'}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              {['all', 'disp', 'uso', 'lav', 'man'].map(filter => (
                <div key={filter} onClick={() => setCurrentFilter(filter)} style={{
                  backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.3s',
                  border: currentFilter === filter ? '3px solid #009688' : '3px solid transparent',
                  borderTop: `5px solid ${filter === 'all' ? '#34495e' : filter === 'disp' ? '#27ae60' : filter === 'uso' ? '#3498db' : filter === 'lav' ? '#f1c40f' : '#e74c3c'}`,
                  transform: currentFilter === filter ? 'scale(1.05)' : 'none'
                }}>
                  <h3 style={{ fontSize: '2rem', marginBottom: '5px', color: filter === 'all' ? '#34495e' : filter === 'disp' ? '#27ae60' : filter === 'uso' ? '#3498db' : filter === 'lav' ? '#f1c40f' : '#e74c3c' }}>
                    {counts[filter as keyof typeof counts]}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                    {filter === 'all' ? t('statAll', currentLang) : filter === 'disp' ? t('statAvailable', currentLang) : filter === 'uso' ? t('statInUse', currentLang) : filter === 'lav' ? t('statWash', currentLang) : t('statMaintenance', currentLang)}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '20px' }}>
              {filteredVehicles.map(vehicle => {
                const fuelClass = vehicle.fuel >= 75 ? 'high' : vehicle.fuel >= 30 ? 'medium' : 'low'
                const remainingKm = vehicle.maintenance - vehicle.km
                const isMaintAlert = remainingKm >= 0 && remainingKm <= 1000
                const isBlocked = vehicle.blocked
                const isMobilization = vehicle.status === 'mobilizacao'
                const statusColor = vehicle.blocked ? BLOCKED_COLOR : STATUS_COLORS[vehicle.status] || STATUS_COLORS.disp

                return (
                  <div key={vehicle.id} style={{
                    backgroundColor: statusColor.bg, borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    borderLeft: `5px solid ${statusColor.border}`, border: isMaintAlert ? '2px solid #e74c3c' : isBlocked ? `2px solid ${BLOCKED_COLOR.border}` : `2px solid ${statusColor.border}`,
                    opacity: isBlocked ? 0.85 : 1, position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s'
                  }}>
                    {isMobilization && (
                      <div style={{ backgroundColor: STATUS_COLORS.mobilizacao.bg, border: `1px solid ${STATUS_COLORS.mobilizacao.border}`, borderRadius: '8px', padding: '10px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🚚</span>
                        <span style={{ color: STATUS_COLORS.mobilizacao.text, fontWeight: 600, fontSize: '0.85rem' }}>{t('vehicleMobilization', currentLang)}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '55px', height: '55px', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 3px 10px rgba(0,0,0,0.15)', border: '2px solid var(--border)', filter: isBlocked ? 'grayscale(100%)' : 'none', backgroundColor: statusColor.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '1.8rem', filter: 'grayscale(100%) brightness(2)' }}>{getVehicleIcon(vehicle.model)}</span>
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{vehicle.tag}</h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>{vehicle.model}</p>
                        </div>
                      </div>
                      <span style={{ padding: '4px 10px', borderRadius: '15px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', backgroundColor: isBlocked ? BLOCKED_COLOR.bg : statusColor.bg, color: isBlocked ? BLOCKED_COLOR.text : statusColor.text, border: `1px solid ${isBlocked ? BLOCKED_COLOR.border : statusColor.border}` }}>
                        {isBlocked ? (currentLang === 'pt' ? 'VEÍCULO BLOQUEADO' : currentLang === 'en' ? 'VEHICLE BLOCKED' : 'VEHÍCULO BLOQUEADO') : vehicle.status === 'disp' ? t('statusAvailable', currentLang) : vehicle.status === 'uso' ? t('statusInUse', currentLang) : vehicle.status === 'lav' ? t('statusWash', currentLang) : vehicle.status === 'man' ? t('statusMaintenance', currentLang) : t('statusMobilization', currentLang)}
                      </span>
                    </div>

                    {/* Aviso de manutenção - apenas para veículos normais */}
                    {isMaintAlert && !isBlocked && !isMobilization && (
                      <div style={{ marginBottom: '10px', backgroundColor: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', borderRadius: '4px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#e74c3c', fontSize: '0.85rem' }}>⚠️</span>
                        <span style={{ color: '#e74c3c', fontWeight: 700, fontSize: '0.75rem' }}>{remainingKm}km</span>
                      </div>
                    )}

                    {/* Grid de Informações - Simplificado para bloqueados/mobilização */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px', fontSize: '0.75rem' }}>
                      <div style={{ backgroundColor: 'var(--bg-main)', padding: '6px 8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase' }}>{t('lblMileage', currentLang)}</span>
                        <span style={{ fontWeight: 600 }}>{vehicle.km.toLocaleString()} km</span>
                      </div>
                      <div style={{ backgroundColor: 'var(--bg-main)', padding: '6px 8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase' }}>{t('lblPlateLabel', currentLang)}</span>
                        <span style={{ fontWeight: 600 }}>{vehicle.plate}</span>
                      </div>
                      {!isBlocked && !isMobilization && (
                        <>
                          <div style={{ backgroundColor: 'var(--bg-main)', padding: '6px 8px', borderRadius: '6px' }}>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase' }}>{t('lblNextMaintLabel', currentLang)}</span>
                            <span style={{ fontWeight: 600, color: isMaintAlert ? '#e74c3c' : 'var(--text-primary)' }}>{vehicle.maintenance ? vehicle.maintenance.toLocaleString() + ' km' : '-'}</span>
                          </div>
                          <div style={{ backgroundColor: 'var(--bg-main)', padding: '6px 8px', borderRadius: '6px' }}>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase' }}>{t('lblDriverLabel', currentLang)}</span>
                            <span style={{ fontWeight: 600 }}>{vehicle.driver || '-'}</span>
                          </div>
                          <div style={{ backgroundColor: 'var(--bg-main)', padding: '6px 8px', borderRadius: '6px', gridColumn: '1 / -1' }}>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase' }}>{t('lblLastLocation', currentLang)}</span>
                            <span style={{ fontWeight: 600 }}>{vehicle.lastLocation || '-'}</span>
                          </div>
                        </>
                      )}
                      {isBlocked && vehicle.blockedReason && (
                        <div style={{ backgroundColor: 'var(--bg-main)', padding: '6px 8px', borderRadius: '6px', gridColumn: '1 / -1' }}>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase' }}>{currentLang === 'pt' ? 'MOTIVO' : currentLang === 'en' ? 'REASON' : 'MOTIVO'}</span>
                          <span style={{ fontWeight: 600, fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }}>{vehicle.blockedReason}</span>
                        </div>
                      )}
                    </div>

                    {!isBlocked && !isMobilization && (
                      <>
                        <div style={{ backgroundColor: 'var(--border)', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                          <div style={{ height: '100%', borderRadius: '3px', width: `${vehicle.fuel}%`, backgroundColor: fuelClass === 'high' ? '#27ae60' : fuelClass === 'medium' ? '#f39c12' : '#e74c3c' }} />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>{t('lblFuelLabel', currentLang)} {vehicle.fuelText}</p>
                      </>
                    )}

                    {/* Botões - bloqueados só mostram Editar */}
                    {isBlocked ? (
                      <button onClick={() => openManageModal(vehicle)} style={{ width: '100%', padding: '10px 6px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', backgroundColor: '#e74c3c', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.85rem' }}>
                        🔓 {currentLang === 'pt' ? 'Desbloquear' : currentLang === 'en' ? 'Unblock' : 'Desbloquear'}
                      </button>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {vehicle.status === 'disp' ? (
                          <>
                            <button onClick={() => openWithdrawModal(vehicle)} style={{ padding: '12px 6px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', backgroundColor: '#3498db', color: 'white', fontSize: '0.8rem', lineHeight: 1.2 }}>
                              🔑 {t('btnWithdraw', currentLang)}
                            </button>
                            <button onClick={() => openServiceModal('man', vehicle)} style={{ padding: '12px 6px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', backgroundColor: '#f39c12', color: 'white', fontSize: '0.8rem', lineHeight: 1.2 }}>
                              🔧 {t('btnMaint', currentLang)}
                            </button>
                          </>
                        ) : (
                          <button onClick={() => openReturnModal(vehicle)} style={{ gridColumn: '1 / -1', padding: '12px 6px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', backgroundColor: '#9b59b6', color: 'white', fontSize: '0.85rem' }}>
                            ↩️ {t('btnReturn', currentLang)}
                          </button>
                        )}
                        <button onClick={() => openManageModal(vehicle)} style={{ gridColumn: '1 / -1', padding: '10px 6px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', backgroundColor: '#34495e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.85rem' }}>
                          ✏️ {t('btnEdit', currentLang)}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
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
