'use client'

import { Vehicle } from '@/types'
import Modal from '@/components/modals/Modal'
import VehicleCard from './VehicleCard'

interface VehicleDetailModalProps {
  vehicle: Vehicle | null
  isOpen: boolean
  onClose: () => void
  currentLang: string
  isAdmin: boolean
  onWithdraw: (vehicle: Vehicle) => void
  onReturn: (vehicle: Vehicle) => void
  onService: (type: 'man' | 'lav', vehicle: Vehicle) => void
  onManage: (vehicle: Vehicle) => void
}

// A "mini card" no Dashboard so mostra o essencial pra escanear a frota
// rapido; ao clicar, abre este popup com o mesmo conteudo detalhado (e as
// acoes) que antes ficava sempre visivel no card - fecha o proprio popup
// antes de abrir o modal da acao escolhida, pra nao empilhar dois modais.
export default function VehicleDetailModal({
  vehicle,
  isOpen,
  onClose,
  currentLang,
  isAdmin,
  onWithdraw,
  onReturn,
  onService,
  onManage
}: VehicleDetailModalProps) {
  if (!vehicle) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${vehicle.tag} - ${vehicle.model}`} maxWidth="480px">
      <VehicleCard
        vehicle={vehicle}
        currentLang={currentLang}
        isAdmin={isAdmin}
        embedded
        onWithdraw={(v) => { onClose(); onWithdraw(v) }}
        onReturn={(v) => { onClose(); onReturn(v) }}
        onService={(type, v) => { onClose(); onService(type, v) }}
        onManage={(v) => { onClose(); onManage(v) }}
      />
    </Modal>
  )
}
