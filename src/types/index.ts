export interface Vehicle {
  id: number;
  tag: string;
  plate: string;
  model: string;
  status: 'disp' | 'uso' | 'lav' | 'man' | 'mobilizacao';
  km: number;
  fuel: number;
  fuelText: string;
  maintenance: number;
  driver: string;
  lastLocation: string;
  obs: string;
  blocked?: boolean;
  blockedReason?: string;
  blockedBy?: string;
  blockedAt?: string;
  regionalId?: string;
  gerenciaId?: string;
  coordenacaoId?: string;
  gestaoId?: string;
  areaId?: string;
  lastStatusChangeAt?: string;
  lastWashedAt?: string;
}

/** Escala de privilegio. Ortogonal ao escopo organizacional: o nivel diz o QUE
 *  a pessoa pode fazer, o escopo diz SOBRE QUAL pedaco da arvore.
 *  Ver docs/RBAC_AUDITORIA.md secao 1. */
export type UserLevel = 'usuario' | 'operador' | 'admin' | 'admin_master' | 'auditor';

/** `pendente` e `bloqueado` sao estados diferentes de proposito: o primeiro
 *  nunca teve acesso e aguarda aprovacao; o segundo teve e foi suspenso.
 *  Um booleano `active` perderia justamente a informacao que a auditoria usa. */
export type UserStatus = 'pendente' | 'ativo' | 'bloqueado' | 'inativo';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  level: UserLevel;
  status: UserStatus;
  /** Unidade organizacional a que a pessoa pertence — normalmente uma `area`.
   *  E o que define com quem ela troca mensagens no forum e o que enxerga. */
  orgUnitId?: string;
  declarado?: {
    gerencia?: string;
    coordenador?: string;
    gestorStaff?: string;
    funcao?: string;
    empresa?: string;
    idCracha?: string;
    rac02?: string;
    prontosCadastrado?: boolean;
  };
  preferencias?: {
    popupNovasMensagens?: boolean;
    idioma?: string;
    tema?: string;
  };
}

export interface ChecklistPhoto {
  id: string;
  title: string;
  obs: string;
  dataUrl: string;
}

export interface HistoryItem {
  id?: string;
  date: string;
  vehicle: string;
  driver: string;
  action: string;
  km: number;
  extra: string;
  location?: { lat: number; lng: number };
  distanceKm?: number;
  travelTimeMinutes?: number;
  photos?: ChecklistPhoto[];
  regionalId?: string;
  gerenciaId?: string;
  signatureUrl?: string;
  customChecklistData?: Record<string, boolean | string>;
}

// ---------------------------------------------------------------------------
// Arvore organizacional
// ---------------------------------------------------------------------------
// A hierarquia tem cinco niveis e cada um carrega atributos proprios:
//
//   Regional > Gerencia > Coordenacao > Gestao > Area
//
// Cada no aponta apenas para o pai imediato (`parentId`). O caminho completo
// ate a raiz fica materializado em `path`, do ancestral mais distante ao pai -
// e isso que permite perguntar "tudo que esta sob esta gerencia" numa consulta
// so, sem varrer a arvore em profundidade a cada filtro ou auditoria.

export const ORG_LEVELS = ['regional', 'gerencia', 'coordenacao', 'gestao', 'area'] as const;
export type OrgLevel = (typeof ORG_LEVELS)[number];

/** Rotulo de cada nivel, no singular e no plural, para a interface. */
export const ORG_LEVEL_LABEL: Record<OrgLevel, { singular: string; plural: string }> = {
  regional: { singular: 'Regional', plural: 'Regionais' },
  gerencia: { singular: 'Gerência', plural: 'Gerências' },
  coordenacao: { singular: 'Coordenação', plural: 'Coordenações' },
  gestao: { singular: 'Gestão', plural: 'Gestões' },
  area: { singular: 'Área', plural: 'Áreas' },
};

/** O nivel imediatamente acima. `null` na raiz. */
export const ORG_PARENT_LEVEL: Record<OrgLevel, OrgLevel | null> = {
  regional: null,
  gerencia: 'regional',
  coordenacao: 'gerencia',
  gestao: 'coordenacao',
  area: 'gestao',
};

export interface OrgUnit {
  id: string;
  level: OrgLevel;
  name: string;
  code: string;
  /** Pai imediato. `null` apenas para `regional`. */
  parentId: string | null;
  /** Ancestrais do mais distante ao pai imediato. Vazio na raiz. */
  path: string[];
  createdAt: string;
  /** Atributos proprios do nivel. Ver ORG_LEVEL_FIELDS em lib/org.ts. */
  attrs: Record<string, string>;
  active?: boolean;
}

/** @deprecated Mantidos para leitura de backups antigos. Use OrgUnit. */
export interface Regional {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  description?: string;
}

/** @deprecated Mantidos para leitura de backups antigos. Use OrgUnit. */
export interface Gerencia {
  id: string;
  regionalId: string;
  name: string;
  code: string;
  responsible: string;
  createdAt: string;
}

export interface ForumComment {
  id: string;
  /** Sempre derivado da sessao autenticada, nunca digitado. */
  authorUid: string;
  author: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  /** Sempre derivado da sessao autenticada, nunca digitado. */
  authorUid: string;
  author: string;
  role: 'Motorista' | 'Operador' | 'Administrador';
  category: 'Aviso' | 'Alerta' | 'Manutenção' | 'Geral';
  /** Escopo de circulacao: a unidade organizacional do autor. */
  orgUnitId?: string;
  /** Caminho do escopo, para filtrar por qualquer ancestral. */
  orgPath?: string[];
  regionalId?: string;
  /** ISO 8601. Ordenavel; o rotulo legivel e formatado na interface. */
  createdAt: string;
  editedAt?: string;
  likes: number;
  comments: ForumComment[];
}

export interface ChecklistField {
  id: string;
  label: string;
  category: 'Segurança' | 'Eletrica' | 'Mecânica' | 'Documentação' | 'Geral';
  required: boolean;
  active: boolean;
}

export interface Translations {
  [key: string]: {
    [lang: string]: string;
  };
}

export type ModalType = 'withdraw' | 'return' | 'service' | 'manage' | 'add' | 'pin';
export type FilterType = 'all' | 'disp' | 'uso' | 'lav' | 'man';
export type PageType =
  | 'dashboard'
  | 'metrics'
  | 'forum'
  | 'regionais'
  | 'drivers'
  | 'settings'
  | 'admin';
