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

export interface Regional {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  description?: string;
}

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
  author: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: string;
  role: 'Motorista' | 'Operador' | 'Administrador';
  category: 'Aviso' | 'Alerta' | 'Manutenção' | 'Geral';
  regionalId?: string;
  createdAt: string;
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
