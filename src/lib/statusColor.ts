import { Vehicle } from '@/types'

// Sistema de cores estritamente semantico: so existem 3 estados possiveis,
// nunca cor por decoracao. Texto deve ser sempre branco sobre estas cores.
export type SemanticStatus = 'ok' | 'alerta' | 'anormal'

export const SEMANTIC_COLORS: Record<SemanticStatus, string> = {
  ok: '#1e8e3e',
  alerta: '#a16207',
  anormal: '#c62828',
}

// Prioridade: bloqueio e manutencao ativa sao anormalidade; km proximo do
// limite de manutencao ou veiculo temporariamente indisponivel (lavador,
// mobilizacao) e alerta; qualquer outro caso e considerado normal.
export const getVehicleSemanticStatus = (vehicle: Vehicle): SemanticStatus => {
  if (vehicle.blocked) return 'anormal'
  if (vehicle.status === 'man') return 'anormal'

  const remaining = vehicle.maintenance - vehicle.km
  if (remaining >= 0 && remaining <= 1000) return 'alerta'
  if (vehicle.status === 'lav' || vehicle.status === 'mobilizacao') return 'alerta'

  return 'ok'
}

// Chave de traducao pro rotulo exibido no badge - prioriza bloqueio, senao
// reflete o status real (evita mostrar "DISPONIVEL" num veiculo bloqueado
// so porque o campo status em si nao mudou).
export const getStatusLabelKey = (vehicle: Vehicle): string => {
  if (vehicle.blocked) return 'vehicleBlocked'
  if (vehicle.status === 'disp') return 'statusAvailable'
  if (vehicle.status === 'uso') return 'statusInUse'
  if (vehicle.status === 'lav') return 'statusWash'
  if (vehicle.status === 'man') return 'statusMaintenance'
  if (vehicle.status === 'mobilizacao') return 'statusMobilization'
  return 'statusAvailable'
}
