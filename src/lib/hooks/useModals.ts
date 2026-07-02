import { useState } from 'react'
import { Vehicle, ModalType } from '@/types'

export function useModals() {
  const [withdrawModal, setWithdrawModal] = useState(false)
  const [returnModal, setReturnModal] = useState(false)
  const [serviceModal, setServiceModal] = useState(false)
  const [manageModal, setManageModal] = useState(false)
  const [addModal, setAddModal] = useState(false)
  const [pinModal, setPinModal] = useState(false)
  
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [serviceType, setServiceType] = useState<'man' | 'lav'>('man')
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [pendingVehicleData, setPendingVehicleData] = useState<Partial<Vehicle> | null>(null)

  const openWithdrawModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setWithdrawModal(true)
  }

  const openReturnModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setReturnModal(true)
  }

  const openServiceModal = (type: 'man' | 'lav', vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setServiceType(type)
    setServiceModal(true)
  }

  const openManageModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setManageModal(true)
  }

  const openAddModal = () => {
    setAddModal(true)
  }

  const openPinModal = (action: string, vehicleData?: Partial<Vehicle>) => {
    setPendingAction(action)
    if (vehicleData) {
      setPendingVehicleData(vehicleData)
    }
    setPinModal(true)
  }

  const closeAllModals = () => {
    setWithdrawModal(false)
    setReturnModal(false)
    setServiceModal(false)
    setManageModal(false)
    setAddModal(false)
    setPinModal(false)
    setSelectedVehicle(null)
    setPendingAction(null)
    setPendingVehicleData(null)
  }

  const closeWithdrawModal = () => {
    setWithdrawModal(false)
    setSelectedVehicle(null)
  }

  const closeReturnModal = () => {
    setReturnModal(false)
    setSelectedVehicle(null)
  }

  const closeServiceModal = () => {
    setServiceModal(false)
    setSelectedVehicle(null)
  }

  const closeManageModal = () => {
    setManageModal(false)
    setSelectedVehicle(null)
  }

  const closeAddModal = () => {
    setAddModal(false)
  }

  const closePinModal = () => {
    setPinModal(false)
    setPendingAction(null)
    setPendingVehicleData(null)
  }

  return {
    // State
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
    
    // Actions
    openWithdrawModal,
    openReturnModal,
    openServiceModal,
    openManageModal,
    openAddModal,
    openPinModal,
    closeAllModals,
    closeWithdrawModal,
    closeReturnModal,
    closeServiceModal,
    closeManageModal,
    closeAddModal,
    closePinModal,
    
    // Setters
    setSelectedVehicle,
    setServiceType,
    setPendingAction,
    setPendingVehicleData,
  }
}