'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '@/lib/firebase'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { Vehicle, HistoryItem } from '@/types'
import { initialVehicles } from '@/lib/constants'

export function useFleetData() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const vehiclesRef = useRef(vehicles)
  const historyRef = useRef(history)
  vehiclesRef.current = vehicles
  historyRef.current = history

  useEffect(() => {
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
        const firestoreVehicles: Vehicle[] = data.vehicles || []
        const firestoreHistory: HistoryItem[] = data.history || []

        if (firestoreVehicles.length > 0) setVehicles(firestoreVehicles)
        if (firestoreHistory.length > 0 || !localBackup) setHistory(firestoreHistory)

        localStorage.setItem('frota_backup', JSON.stringify({
          vehicles: firestoreVehicles.length > 0 ? firestoreVehicles : vehiclesRef.current,
          history: firestoreHistory.length > 0 ? firestoreHistory : historyRef.current,
          backupDate: new Date().toISOString()
        }))
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

  const saveData = useCallback(async (newVehicles: Vehicle[], newHistory: HistoryItem[]) => {
    try {
      await setDoc(doc(db, 'frota', 'data'), {
        vehicles: newVehicles, history: newHistory, lastUpdated: new Date().toISOString(), version: '2.0'
      }, { merge: true })
    } catch (e) {
      console.error('Error saving data to Firestore', e)
    } finally {
      localStorage.setItem('frota_backup', JSON.stringify({
        vehicles: newVehicles, history: newHistory, backupDate: new Date().toISOString()
      }))
    }
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
