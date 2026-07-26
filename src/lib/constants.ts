import { Vehicle, Regional, Gerencia, ChecklistField, ForumPost } from '@/types'

export const initialVehicles: Vehicle[] = [
  { id: 1, tag: 'TN-01', plate: 'FQQ8B72', model: 'VW Nivus', status: 'disp', km: 37449, fuel: 45, fuelText: '45%', maintenance: 40000, driver: '', lastLocation: '', obs: 'Veículo em ótimo estado de conservação', regionalId: 'reg-carajas', gerenciaId: 'ger-log', lastStatusChangeAt: '2026-07-25T10:00:00Z', lastWashedAt: '2026-07-20T14:00:00Z' },
  { id: 2, tag: 'TN-03', plate: 'TCD7H75', model: 'Toyota Hilux', status: 'disp', km: 37310, fuel: 75, fuelText: '75%', maintenance: 40000, driver: '', lastLocation: 'Nucleo', obs: 'Verificado nível de óleo recentemente', regionalId: 'reg-carajas', gerenciaId: 'ger-op', lastStatusChangeAt: '2026-07-24T18:30:00Z', lastWashedAt: '2026-07-15T09:00:00Z' },
  { id: 3, tag: 'TN-04', plate: 'TDM2E37', model: 'Toyota Hilux', status: 'uso', km: 31816, fuel: 100, fuelText: '100%', maintenance: 35000, driver: 'Robson', lastLocation: 'CCO', obs: 'Destinado para inspeção de rota N4E', regionalId: 'reg-vitoria', gerenciaId: 'ger-log', lastStatusChangeAt: '2026-07-26T07:00:00Z', lastWashedAt: '2026-07-22T11:00:00Z' },
  { id: 4, tag: 'TN-29', plate: 'SHX8B70', model: 'Chevrolet S10', status: 'disp', km: 12400, fuel: 100, fuelText: '100%', maintenance: 20000, driver: '', lastLocation: 'Infratech', obs: 'Pneu estepe revisado', regionalId: 'reg-carajas', gerenciaId: 'ger-man', lastStatusChangeAt: '2026-07-23T12:00:00Z', lastWashedAt: '2026-07-18T16:00:00Z' },
  { id: 5, tag: 'TN-31', plate: 'TCD7I68', model: 'Toyota Hilux', status: 'disp', km: 32142, fuel: 50, fuelText: '50%', maintenance: 35000, driver: '', lastLocation: 'Infratech', obs: 'Bateria trocada no mês passado', regionalId: 'reg-vitoria', gerenciaId: 'ger-op', lastStatusChangeAt: '2026-07-25T15:45:00Z', lastWashedAt: '2026-07-10T10:00:00Z' },
  { id: 6, tag: 'TN-72', plate: 'FXD9A18', model: 'Toyota Hilux', status: 'man', km: 121342, fuel: 100, fuelText: '100%', maintenance: 125000, driver: 'Mecanica Central', lastLocation: 'Oficina Centralizada', obs: 'Aguardando substituição das pastilhas de freio dianteiras', regionalId: 'reg-carajas', gerenciaId: 'ger-man', lastStatusChangeAt: '2026-07-21T08:00:00Z', lastWashedAt: '2026-07-05T08:00:00Z' },
  { id: 7, tag: 'TN-73', plate: 'TXX4C32', model: 'Toyota Hilux', status: 'disp', km: 31581, fuel: 50, fuelText: '50%', maintenance: 35000, driver: '', lastLocation: 'Infratech', obs: 'Higienização interna recomendada', regionalId: 'reg-carajas', gerenciaId: 'ger-log', lastStatusChangeAt: '2026-07-24T09:00:00Z', lastWashedAt: '2026-06-28T14:00:00Z' },
  { id: 8, tag: 'TN-74', plate: 'RDM2E33', model: 'Chevrolet S10', status: 'lav', km: 32458, fuel: 100, fuelText: '100%', maintenance: 35000, driver: 'Lavador Pátio', lastLocation: 'Lavador de NG', obs: 'Em processo de lavagem completa e sanitização', regionalId: 'reg-carajas', gerenciaId: 'ger-man', lastStatusChangeAt: '2026-07-26T06:30:00Z', lastWashedAt: '2026-07-26T06:30:00Z' },
  { id: 9, tag: 'TN-76', plate: 'TCD7H72', model: 'Toyota Hilux', status: 'disp', km: 30312, fuel: 100, fuelText: '100%', maintenance: 35000, driver: '', lastLocation: 'Patio B', obs: 'Checklist completo aprovado', regionalId: 'reg-vitoria', gerenciaId: 'ger-log', lastStatusChangeAt: '2026-07-25T11:20:00Z', lastWashedAt: '2026-07-24T17:00:00Z' },
  { id: 10, tag: 'TN-78', plate: 'FZY4F28', model: 'Ford Ranger', status: 'disp', km: 125429, fuel: 100, fuelText: '100%', maintenance: 130000, driver: '', lastLocation: 'Praca da Bandeira', obs: 'Próxima da revisão de 130.000km', regionalId: 'reg-vitoria', gerenciaId: 'ger-op', lastStatusChangeAt: '2026-07-23T14:00:00Z', lastWashedAt: '2026-07-12T13:00:00Z' },
  { id: 11, tag: 'TN-02', plate: 'SZQ2H84', model: 'Toyota Hilux (ALCON+KOFRE)', status: 'disp', km: 38873, fuel: 50, fuelText: '50%', maintenance: 41008, driver: '', lastLocation: 'Infratech', obs: 'Equipado com cofre reforçado e rádio digital', regionalId: 'reg-carajas', gerenciaId: 'ger-log', lastStatusChangeAt: '2026-07-24T16:00:00Z', lastWashedAt: '2026-07-19T10:00:00Z' },
  { id: 12, tag: 'TN-99', plate: 'ABC1D23', model: 'Toyota Hilux', status: 'mobilizacao', km: 15000, fuel: 80, fuelText: '80%', maintenance: 35000, driver: '', lastLocation: 'Oficina', obs: 'Em processo de mobilização para obra', blocked: false, regionalId: 'reg-carajas', gerenciaId: 'ger-op', lastStatusChangeAt: '2026-07-20T08:00:00Z', lastWashedAt: '2026-07-14T09:00:00Z' },
  { id: 13, tag: 'TN-88', plate: 'XYZ9W87', model: 'Ford Ranger', status: 'disp', km: 45000, fuel: 60, fuelText: '60%', maintenance: 50000, driver: '', lastLocation: 'Patio', obs: 'Suspensão e pneus em observação preventiva', blocked: true, blockedReason: 'Pneus precisam ser trocados', blockedBy: 'Admin', blockedAt: '27/03/2026', regionalId: 'reg-carajas', gerenciaId: 'ger-man', lastStatusChangeAt: '2026-07-18T10:00:00Z', lastWashedAt: '2026-07-08T11:00:00Z' }
]

export const initialRegionais: Regional[] = [
  { id: 'reg-carajas', name: 'Regional Carajás (Norte)', code: 'REG-CRJ', createdAt: '2026-01-10', description: 'Atendimento à operação de mineração e logística do Corredor Norte' },
  { id: 'reg-vitoria', name: 'Regional Vitória (Sudeste)', code: 'REG-VIT', createdAt: '2026-02-15', description: 'Atendimento aos portos, terminais e pátios da região Sudeste' }
]

export const initialGerencias: Gerencia[] = [
  { id: 'ger-log', regionalId: 'reg-carajas', name: 'Gerência de Logística e Transporte', code: 'GER-LOG', responsible: 'Carlos Eduardo Silva', createdAt: '2026-01-15' },
  { id: 'ger-man', regionalId: 'reg-carajas', name: 'Gerência de Manutenção de Ativos Móveis', code: 'GER-MAN', responsible: 'Ana Paula Santos', createdAt: '2026-01-20' },
  { id: 'ger-op', regionalId: 'reg-vitoria', name: 'Gerência de Operações de Mina e Pátio', code: 'GER-OP', responsible: 'Marcelo Oliveira', createdAt: '2026-02-18' }
]

export const initialChecklistFields: ChecklistField[] = [
  { id: 'chk-1', label: 'Faróis, setas, luz de ré e giroflex testados', category: 'Eletrica', required: true, active: true },
  { id: 'chk-2', label: 'Pneus calibrados, estepe e sem avarias visíveis', category: 'Mecânica', required: true, active: true },
  { id: 'chk-3', label: 'Freio de serviço e freio de mão verificados', category: 'Mecânica', required: true, active: true },
  { id: 'chk-4', label: 'Extintor de incêndio, triângulo e kit emergência', category: 'Segurança', required: true, active: true },
  { id: 'chk-5', label: 'Rádio transceptor e comunicação operacional', category: 'Segurança', required: true, active: true },
  { id: 'chk-6', label: 'Nível de combustível e fluido Arla adequados para rota', category: 'Geral', required: true, active: true },
  { id: 'chk-7', label: 'Cintos de segurança operacionais em todas as posições', category: 'Segurança', required: true, active: true },
  { id: 'chk-8', label: 'Documentação do veículo (CRLV) e CNH do condutor válidos', category: 'Documentação', required: true, active: true }
]

export const initialForumPosts: ForumPost[] = [
  {
    id: 'post-1',
    title: '📢 Atenção na Rota N4E - Trecho de Acesso à Mina em Manutenção',
    content: 'Informamos a todos os motoristas que o trecho N4E está com obras de nivelamento de pista. Favor redobrar atenção e reduzir velocidade máxima para 30km/h no setor.',
    author: 'Gestão de Segurança (SMS)',
    role: 'Administrador',
    category: 'Alerta',
    regionalId: 'reg-carajas',
    createdAt: '26/07/2026 08:30',
    likes: 12,
    comments: [
      { id: 'c-1', author: 'João Pereira', role: 'Motorista', content: 'Ciente! Passei lá cedo e o trânsito está no sistema siga e pare.', createdAt: '26/07/2026 09:15' }
    ]
  },
  {
    id: 'post-2',
    title: '🚿 Lavador do Pátio Centralizado Liberado',
    content: 'O lavador automático do pátio centralizado voltou a operar normalmente em capacidade total de higienização de cabines e chassi.',
    author: 'Coordenação de Higienização',
    role: 'Operador',
    category: 'Aviso',
    regionalId: 'reg-carajas',
    createdAt: '25/07/2026 14:20',
    likes: 8,
    comments: []
  },
  {
    id: 'post-3',
    title: '🔧 Cronograma de Calibração Preditiva de Pneus',
    content: 'Iniciamos a rodada mensal de aferição de desgaste e calibração de frota leve. Favor apresentar os veículos com final de tag ímpar no pátio até sexta-feira.',
    author: 'Equipe de Manutenção',
    role: 'Administrador',
    category: 'Manutenção',
    regionalId: 'reg-vitoria',
    createdAt: '24/07/2026 11:00',
    likes: 15,
    comments: []
  }
]

export const FUEL_OPTIONS = [
  { value: 'Reserva', label: 'Reserva' },
  { value: '1/4', label: '1/4' },
  { value: '2/4', label: '2/4' },
  { value: '3/4', label: '3/4' },
  { value: 'Cheio', label: 'Cheio' }
]

export const RETURN_LOCATIONS = [
  'Parauapebas',
  'Praca da Bandeira',
  'CCO',
  'Cafeteira',
  'Nucleo',
  'Helio Grace',
  'Infratech',
  'Oficina Centralizada',
  'Lavador',
  'Meio Ambiente',
  'Outros'
]

export const VEHICLE_IMAGES: Record<string, string> = {
  hilux: '/vehicles/hilux.png',
  nivus: '/vehicles/nivus.png',
  s10: '/vehicles/s10.png',
  ranger: '/vehicles/ranger.png',
  generic: '/vehicles/generic.png'
}
