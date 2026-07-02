'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/firebase'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { Vehicle, HistoryItem } from '@/types'

const initialVehicles: Vehicle[] = [
  { id: 1, tag: 'TN-01', plate: 'FQQ8B72', model: 'VW Nivus', status: 'disp', km: 37449, fuel: 45, fuelText: '45%', maintenance: 40000, driver: '', lastLocation: '', obs: '' },
  { id: 2, tag: 'TN-03', plate: 'TCD7H75', model: 'Toyota Hilux', status: 'disp', km: 37310, fuel: 75, fuelText: '75%', maintenance: 40000, driver: '', lastLocation: 'Nucleo', obs: '' },
  { id: 3, tag: 'TN-04', plate: 'TDM2E37', model: 'Toyota Hilux', status: 'uso', km: 31816, fuel: 100, fuelText: '100%', maintenance: 35000, driver: 'Robson', lastLocation: '', obs: '' },
  { id: 4, tag: 'TN-29', plate: 'SHX8B70', model: 'Chevrolet S10', status: 'disp', km: 0, fuel: 100, fuelText: '100%', maintenance: 10000, driver: '', lastLocation: 'Infratech', obs: '' },
  { id: 5, tag: 'TN-31', plate: 'TCD7I68', model: 'Toyota Hilux', status: 'disp', km: 32142, fuel: 50, fuelText: '50%', maintenance: 35000, driver: '', lastLocation: 'Infratech', obs: '' },
  { id: 6, tag: 'TN-72', plate: 'FXD9A18', model: 'Toyota Hilux', status: 'disp', km: 121342, fuel: 100, fuelText: '100%', maintenance: 125000, driver: '', lastLocation: '', obs: '' },
  { id: 7, tag: 'TN-73', plate: 'TYG3A22', model: 'Fiat Strada', status: 'disp', km: 31581, fuel: 50, fuelText: '50%', maintenance: 35000, driver: '', lastLocation: 'Infratech', obs: '' },
  { id: 8, tag: 'TN-74', plate: 'RDM2E33', model: 'Chevrolet S10', status: 'disp', km: 32458, fuel: 100, fuelText: '100%', maintenance: 10000, driver: '', lastLocation: 'Lavador de NG', obs: '' },
  { id: 9, tag: 'TN-76', plate: 'TCD7H72', model: 'Toyota Hilux', status: 'disp', km: 30312, fuel: 100, fuelText: '100%', maintenance: 10000, driver: '', lastLocation: '', obs: '' },
  { id: 10, tag: 'TN-78', plate: 'FZY4F28', model: 'Ford Ranger', status: 'disp', km: 125429, fuel: 100, fuelText: '100%', maintenance: 130000, driver: '', lastLocation: '', obs: '' },
  { id: 11, tag: 'TN-02', plate: 'SZQ2H84', model: 'Toyota Hilux (ALCON+KOFRE)', status: 'disp', km: 38873, fuel: 50, fuelText: '50%', maintenance: 41008, driver: '', lastLocation: 'Infratech', obs: '' },
  { id: 12, tag: 'TN-99', plate: 'ABC1D23', model: 'Toyota Hilux', status: 'mobilizacao', km: 15000, fuel: 80, fuelText: '80%', maintenance: 35000, driver: '', lastLocation: 'Oficina', obs: 'Em processo de mobilização para obra', blocked: false },
  { id: 13, tag: 'TN-88', plate: 'XYZ9W87', model: 'Ford Ranger', status: 'disp', km: 45000, fuel: 60, fuelText: '60%', maintenance: 50000, driver: '', lastLocation: 'Patio', obs: '', blocked: true, blockedReason: 'Pneus precisam ser trocados', blockedBy: 'Admin', blockedAt: '27/03/2026' }
]

export function useFirebase() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'frota', 'data'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        setVehicles(data.vehicles || initialVehicles)
        setHistory(data.history || [])
      } else {
        setVehicles(initialVehicles)
        setDoc(doc(db, 'frota', 'data'), { vehicles: initialVehicles, history: [] })
      }
      setLoading(false)
    }, (error) => {
      console.error("Error fetching Firestore data:", error)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  const saveData = useCallback(async (newVehicles: Vehicle[], newHistory: HistoryItem[]) => {
    try {
      await setDoc(doc(db, 'frota', 'data'), {
        vehicles: newVehicles,
        history: newHistory
      })
    } catch (e) {
      console.error('Error saving data to Firestore', e)
    }
  }, [])

  const addToHistory = useCallback((vehicle: Vehicle, action: string, driver: string, km: number, extra: string = '', currentVehicles: Vehicle[] = vehicles) => {
    const now = new Date()
    const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR')
    const newHistoryItem: HistoryItem = {
      date: dateStr,
      vehicle: `${vehicle.tag} (${vehicle.plate})`,
      driver,
      action,
      km,
      extra
    }
    const newHistory = [...history, newHistoryItem]
    setHistory(newHistory)
    saveData(currentVehicles, newHistory)
  }, [history, saveData])

  const getFuelPercent = (text: string): number => {
    const map: { [key: string]: number } = {
      'Reserva': 10,
      '1/4': 25,
      '2/4': 50,
      '3/4': 75,
      'Cheio': 100
    }
    return map[text] || 50
  }

  return {
    vehicles,
    setVehicles,
    history,
    setHistory,
    loading,
    saveData,
    addToHistory,
    getFuelPercent
  }
}