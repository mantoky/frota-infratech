'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '@/lib/firebase'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { Vehicle, HistoryItem } from '@/types'
import { initialVehicles } from '@/lib/constants'

const BACKUP_KEY = 'frota_backup'

interface LocalBackup {
  vehicles: Vehicle[]
  history: HistoryItem[]
  lastUpdated: string
  synced: boolean
}

function readBackup(): LocalBackup | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    console.error('Error loading local backup:', e)
    return null
  }
}

function writeBackup(vehicles: Vehicle[], history: HistoryItem[], synced: boolean, lastUpdated?: string) {
  const backup: LocalBackup = { vehicles, history, lastUpdated: lastUpdated || new Date().toISOString(), synced }
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backup))
  return backup
}

// Camada de dados offline-first: o localStorage e a fonte primaria, sempre
// disponivel mesmo sem rede nenhuma (ex: rede corporativa que bloqueia o
// Firestore). O Firestore vira uma sincronizacao best-effort em segundo
// plano - tenta escrever, e se falhar so tenta de novo quando detectar que
// voltou a rede. Nao ha fila de multiplas pendencias porque cada escrita ja
// contem o estado completo (vehicles+history), entao a mais recente sempre
// supera qualquer tentativa anterior que ainda nao tenha sincronizado.
export function useFleetData() {
  const initialBackup = readBackup()

  const [vehicles, setVehicles] = useState<Vehicle[]>(initialBackup?.vehicles || [])
  const [history, setHistory] = useState<HistoryItem[]>(initialBackup?.history || [])
  const [loading, setLoading] = useState(!initialBackup)

  const historyRef = useRef(history)
  const lastUpdatedRef = useRef(initialBackup?.lastUpdated || '')
  useEffect(() => {
    historyRef.current = history
  }, [history])

  const pushToFirestore = useCallback(async (newVehicles: Vehicle[], newHistory: HistoryItem[], lastUpdated: string) => {
    try {
      await setDoc(doc(db, 'frota', 'data'), {
        vehicles: newVehicles, history: newHistory, lastUpdated, version: '2.0'
      }, { merge: true })
      writeBackup(newVehicles, newHistory, true, lastUpdated)
    } catch (e) {
      console.error('Sincronizacao com Firestore falhou, tentando de novo quando a rede voltar', e)
    }
  }, [])

  const saveData = useCallback(async (newVehicles: Vehicle[], newHistory: HistoryItem[]) => {
    const lastUpdated = new Date().toISOString()
    lastUpdatedRef.current = lastUpdated
    // Grava local primeiro e sempre - o app funciona mesmo sem rede nenhuma.
    writeBackup(newVehicles, newHistory, false, lastUpdated)
    await pushToFirestore(newVehicles, newHistory, lastUpdated)
  }, [pushToFirestore])

  // Tenta sincronizar o que ficou pendente: ao montar, e sempre que o
  // navegador detectar que a rede voltou.
  useEffect(() => {
    const retryPendingSync = () => {
      const backup = readBackup()
      if (backup && !backup.synced) {
        pushToFirestore(backup.vehicles, backup.history, backup.lastUpdated)
      }
    }
    retryPendingSync()
    window.addEventListener('online', retryPendingSync)
    return () => window.removeEventListener('online', retryPendingSync)
  }, [pushToFirestore])

  useEffect(() => {
    const localBackup = readBackup()

    const unsub = onSnapshot(doc(db, 'frota', 'data'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        const firestoreVehicles: Vehicle[] = data.vehicles || []
        const firestoreHistory: HistoryItem[] = data.history || []
        const firestoreLastUpdated: string = data.lastUpdated || ''

        // So aceita o dado remoto se for mais novo que o que ja temos local
        // - evita que um eco atrasado do Firestore sobrescreva uma edicao
        // offline mais recente.
        const isNewer = !lastUpdatedRef.current || (firestoreLastUpdated && firestoreLastUpdated > lastUpdatedRef.current)

        if (isNewer && (firestoreVehicles.length > 0 || firestoreHistory.length > 0)) {
          setVehicles(firestoreVehicles)
          setHistory(firestoreHistory)
          lastUpdatedRef.current = firestoreLastUpdated || new Date().toISOString()
          writeBackup(firestoreVehicles, firestoreHistory, true, lastUpdatedRef.current)
        } else if (!localBackup && firestoreVehicles.length === 0) {
          setVehicles(initialVehicles)
          setDoc(doc(db, 'frota', 'data'), {
            vehicles: initialVehicles, history: [], createdAt: new Date().toISOString(), version: '2.0'
          }, { merge: true })
        }
      } else if (!localBackup) {
        setVehicles(initialVehicles)
        setDoc(doc(db, 'frota', 'data'), {
          vehicles: initialVehicles, history: [], createdAt: new Date().toISOString(), version: '2.0'
        }, { merge: true })
      }
      setLoading(false)
    }, (error) => {
      console.error('Error fetching Firestore data:', error)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  const addToHistory = useCallback((vehicle: Vehicle, action: string, driver: string, km: number, extra: string, currentVehicles: Vehicle[]) => {
    const now = new Date()
    const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR')
    const newHistoryItem: HistoryItem = {
      date: dateStr, vehicle: `${vehicle.tag} (${vehicle.plate})`, driver, action, km, extra
    }
    const newHistory = [...historyRef.current, newHistoryItem]
    setHistory(newHistory)
    saveData(currentVehicles, newHistory)
  }, [saveData])

  return { vehicles, setVehicles, history, loading, saveData, addToHistory }
}
