import { Vehicle } from '@/types';

// Sistema de cores estritamente semantico: so existem 3 estados possiveis,
// nunca cor por decoracao.
export type SemanticStatus = 'ok' | 'alerta' | 'anormal';

// Os valores apontam pros tokens de globals.css em vez de hex fixo. E isso que
// permite o mesmo componente ter contraste correto nos dois temas: no modo
// escuro os tokens trocam sozinhos, sem nenhum if de tema no JSX.
//
// SEMANTIC_COLORS = fundo preenchido, texto branco por cima (badges, banners).
// SEMANTIC_TEXT   = mesma ideia semantica, mas como cor de texto/icone sobre
//                   superficie de card.
// Trocar um pelo outro derruba o contraste, por isso os dois existem separados.
export const SEMANTIC_COLORS: Record<SemanticStatus, string> = {
  ok: 'var(--state-ok-solid)',
  alerta: 'var(--state-alert-solid)',
  anormal: 'var(--state-danger-solid)',
};

export const SEMANTIC_TEXT: Record<SemanticStatus, string> = {
  ok: 'var(--state-ok)',
  alerta: 'var(--state-alert)',
  anormal: 'var(--state-danger)',
};

export const SEMANTIC_SOFT: Record<SemanticStatus, string> = {
  ok: 'var(--state-ok-soft)',
  alerta: 'var(--state-alert-soft)',
  anormal: 'var(--state-danger-soft)',
};

// Prioridade: bloqueio e manutencao ativa sao anormalidade; km proximo do
// limite de manutencao ou veiculo temporariamente indisponivel (lavador,
// mobilizacao) e alerta; qualquer outro caso e considerado normal.
export const getVehicleSemanticStatus = (vehicle: Vehicle): SemanticStatus => {
  if (vehicle.blocked) return 'anormal';
  if (vehicle.status === 'man') return 'anormal';

  const remaining = vehicle.maintenance - vehicle.km;
  if (remaining >= 0 && remaining <= 1000) return 'alerta';
  if (vehicle.status === 'lav' || vehicle.status === 'mobilizacao') return 'alerta';

  return 'ok';
};

// Chave de traducao pro rotulo exibido no badge - prioriza bloqueio, senao
// reflete o status real (evita mostrar "DISPONIVEL" num veiculo bloqueado
// so porque o campo status em si nao mudou).
export const getStatusLabelKey = (vehicle: Vehicle): string => {
  if (vehicle.blocked) return 'vehicleBlocked';
  if (vehicle.status === 'disp') return 'statusAvailable';
  if (vehicle.status === 'uso') return 'statusInUse';
  if (vehicle.status === 'lav') return 'statusWash';
  if (vehicle.status === 'man') return 'statusMaintenance';
  if (vehicle.status === 'mobilizacao') return 'statusMobilization';
  return 'statusAvailable';
};

// Combustivel tratado como faixa semantica, nao como gradiente continuo:
// abaixo de 30% e anormalidade operacional (nao sai em rota), entre 30 e 75
// e alerta de reabastecimento. Estava duplicado em VehicleCard e
// VehicleMiniCard - centralizado aqui pra os dois nao divergirem.
export const getFuelSemanticStatus = (fuel: number): SemanticStatus =>
  fuel >= 75 ? 'ok' : fuel >= 30 ? 'alerta' : 'anormal';
