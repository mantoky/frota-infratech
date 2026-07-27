import { OrgLevel, OrgUnit, ORG_LEVELS, ORG_PARENT_LEVEL } from '@/types';

// ---------------------------------------------------------------------------
// Atributos proprios de cada nivel
// ---------------------------------------------------------------------------
// A hierarquia nao e so um encadeamento de nomes: cada posto responde por
// coisas diferentes, e a auditoria precisa saber POR QUEM. Uma regional tem
// sede e responsavel institucional; uma coordenacao tem coordenador e turno;
// uma area tem o codigo com que a frota e registrada (ex.: `Infratech-No`),
// que e justamente o que delimita quem conversa com quem no forum.
//
// Declarar os campos aqui, e nao espalhados por formularios, faz com que
// acrescentar um atributo novo seja uma linha - e garante que a tela de
// cadastro e a de leitura nunca discordem sobre o que existe.

export interface OrgFieldSpec {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  /** Explica por que o campo existe, quando isso nao e obvio. */
  hint?: string;
}

export const ORG_LEVEL_FIELDS: Record<OrgLevel, OrgFieldSpec[]> = {
  regional: [
    { key: 'responsavel', label: 'Responsável institucional', placeholder: 'Nome completo' },
    { key: 'sede', label: 'Sede', placeholder: 'Cidade' },
    { key: 'uf', label: 'UF', placeholder: 'PA' },
    { key: 'descricao', label: 'Descrição', placeholder: 'Escopo de atuação da regional' },
  ],
  gerencia: [
    { key: 'gerente', label: 'Gerente', required: true, placeholder: 'Nome completo' },
    { key: 'email', label: 'E-mail corporativo', placeholder: 'nome@empresa.com.br' },
    { key: 'centroCusto', label: 'Centro de custo', placeholder: 'CC-0000' },
  ],
  coordenacao: [
    { key: 'coordenador', label: 'Coordenador', required: true, placeholder: 'Nome completo' },
    { key: 'turno', label: 'Turno', placeholder: 'Administrativo · 1º turno · 2º turno' },
    { key: 'telefone', label: 'Telefone de plantão', placeholder: '(00) 00000-0000' },
  ],
  gestao: [
    { key: 'gestor', label: 'Gestor', required: true, placeholder: 'Nome completo' },
    { key: 'staff', label: 'Staff', placeholder: 'Responsável de apoio' },
    { key: 'contrato', label: 'Contrato', placeholder: 'Número do contrato' },
  ],
  area: [
    {
      key: 'registroFrota',
      label: 'Área de registro da frota',
      required: true,
      placeholder: 'Infratech-No',
      hint: 'É este código que delimita quem troca mensagens com quem no fórum.',
    },
    { key: 'responsavel', label: 'Responsável pela área', placeholder: 'Nome completo' },
    { key: 'empresa', label: 'Empresa', placeholder: 'Própria ou terceira' },
  ],
};

/** Prefixo do id gerado, por nivel. Legivel no console do Firestore. */
const ID_PREFIX: Record<OrgLevel, string> = {
  regional: 'reg',
  gerencia: 'ger',
  coordenacao: 'coord',
  gestao: 'gest',
  area: 'area',
};

export function novoOrgId(level: OrgLevel): string {
  return `${ID_PREFIX[level]}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Indexa por id uma vez, para nao varrer a lista dentro de laco. */
export function indexarPorId(units: OrgUnit[]): Map<string, OrgUnit> {
  return new Map(units.map((u) => [u.id, u]));
}

/** Caminho do no ate a raiz, do ancestral mais distante ao pai imediato.
 *  Para de subir em 10 saltos: um ciclo em `parentId` - que uma edicao manual
 *  no console do Firestore pode criar - travaria o app inteiro num laco
 *  infinito, e a arvore so tem cinco niveis. */
export function calcularPath(units: OrgUnit[], parentId: string | null): string[] {
  if (!parentId) return [];
  const porId = indexarPorId(units);
  const path: string[] = [];
  let atual = porId.get(parentId);
  let saltos = 0;
  while (atual && saltos < 10) {
    path.unshift(atual.id);
    atual = atual.parentId ? porId.get(atual.parentId) : undefined;
    saltos += 1;
  }
  return path;
}

/** Recalcula `path` de toda a arvore. Usado depois de importar ou migrar. */
export function reconstruirPaths(units: OrgUnit[]): OrgUnit[] {
  return units.map((u) => ({ ...u, path: calcularPath(units, u.parentId) }));
}

export function filhosDe(units: OrgUnit[], parentId: string | null): OrgUnit[] {
  return units
    .filter((u) => u.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function porNivel(units: OrgUnit[], level: OrgLevel): OrgUnit[] {
  return units.filter((u) => u.level === level);
}

/** Toda a subarvore a partir de um no, ele inclusive. Barato por causa do
 *  `path` materializado: e um filtro linear, nao uma travessia recursiva. */
export function descendentesDe(units: OrgUnit[], id: string): OrgUnit[] {
  return units.filter((u) => u.id === id || u.path.includes(id));
}

/** Nome legivel do caminho completo: "Regional Carajás › Gerência ... › Área". */
export function trilha(units: OrgUnit[], unit: OrgUnit | undefined): string {
  if (!unit) return '';
  const porId = indexarPorId(units);
  const nomes = [...unit.path.map((id) => porId.get(id)?.name).filter(Boolean), unit.name];
  return nomes.join(' › ');
}

/** A unidade mais especifica que o perfil declara, e todo o caminho dela.
 *  E o que define o escopo de circulacao de mensagens no forum. */
export function escopoDoUsuario(
  units: OrgUnit[],
  orgUnitId: string | undefined
): { unit?: OrgUnit; path: string[] } {
  if (!orgUnitId) return { path: [] };
  const unit = units.find((u) => u.id === orgUnitId);
  if (!unit) return { path: [] };
  return { unit, path: [...unit.path, unit.id] };
}

/** Impede excluir um no que ainda sustenta outros: apagar uma gerencia com
 *  coordenacoes penduradas deixaria orfaos invisiveis na interface, que e
 *  pior do que recusar a operacao. */
export function podeExcluir(units: OrgUnit[], id: string): { ok: boolean; motivo?: string } {
  const filhos = units.filter((u) => u.parentId === id);
  if (filhos.length > 0) {
    return {
      ok: false,
      motivo: `Esta unidade ainda tem ${filhos.length} ${
        filhos.length === 1 ? 'unidade subordinada' : 'unidades subordinadas'
      }. Remova ou realoque antes.`,
    };
  }
  return { ok: true };
}

/** Converte o formato v1 (Regional[] + Gerencia[]) para a arvore de cinco
 *  niveis. Roda uma vez por instalacao; sem isso, quem ja usava o app perderia
 *  a estrutura que cadastrou. Os niveis que nao existiam sao criados como
 *  "padrao" para que os veiculos continuem pendurados em algum lugar valido. */
export function migrarDaV1(
  regionais: { id: string; name: string; code: string; createdAt: string; description?: string }[],
  gerencias: {
    id: string;
    regionalId: string;
    name: string;
    code: string;
    responsible: string;
    createdAt: string;
  }[]
): OrgUnit[] {
  const units: OrgUnit[] = [];

  for (const r of regionais) {
    units.push({
      id: r.id,
      level: 'regional',
      name: r.name,
      code: r.code,
      parentId: null,
      path: [],
      createdAt: r.createdAt,
      attrs: { descricao: r.description || '' },
    });
  }

  for (const g of gerencias) {
    units.push({
      id: g.id,
      level: 'gerencia',
      name: g.name,
      code: g.code,
      parentId: g.regionalId,
      path: [g.regionalId],
      createdAt: g.createdAt,
      attrs: { gerente: g.responsible || '' },
    });

    // Coordenacao > Gestao > Area padrao. A alternativa seria deixar a
    // gerencia como folha, mas ai nenhum veiculo teria area - e a area e o
    // que delimita o forum.
    const coordId = `${g.id}-coord-padrao`;
    const gestId = `${g.id}-gest-padrao`;
    const areaId = `${g.id}-area-padrao`;
    units.push({
      id: coordId,
      level: 'coordenacao',
      name: 'Coordenação Local',
      code: `${g.code}-C1`,
      parentId: g.id,
      path: [g.regionalId, g.id],
      createdAt: g.createdAt,
      attrs: { coordenador: g.responsible || 'A definir' },
    });
    units.push({
      id: gestId,
      level: 'gestao',
      name: 'Gestão Operacional',
      code: `${g.code}-G1`,
      parentId: coordId,
      path: [g.regionalId, g.id, coordId],
      createdAt: g.createdAt,
      attrs: { gestor: 'A definir' },
    });
    units.push({
      id: areaId,
      level: 'area',
      name: 'Infratech-No',
      code: `${g.code}-A1`,
      parentId: gestId,
      path: [g.regionalId, g.id, coordId, gestId],
      createdAt: g.createdAt,
      attrs: { registroFrota: 'Infratech-No' },
    });
  }

  return units;
}

/** Valida um no antes de gravar. Devolve a lista de problemas, vazia se ok. */
export function validarUnidade(
  units: OrgUnit[],
  candidato: { id?: string; level: OrgLevel; name: string; code: string; parentId: string | null },
  attrs: Record<string, string>
): string[] {
  const erros: string[] = [];
  if (!candidato.name.trim()) erros.push('O nome é obrigatório.');
  if (!candidato.code.trim()) erros.push('O código é obrigatório.');

  const paiEsperado = ORG_PARENT_LEVEL[candidato.level];
  if (paiEsperado && !candidato.parentId) {
    erros.push(`Selecione a ${paiEsperado} à qual esta unidade pertence.`);
  }
  if (paiEsperado && candidato.parentId) {
    const pai = units.find((u) => u.id === candidato.parentId);
    if (!pai) erros.push('A unidade superior selecionada não existe mais.');
    else if (pai.level !== paiEsperado) {
      erros.push(`Uma ${candidato.level} só pode pertencer a uma ${paiEsperado}.`);
    }
  }

  const codigoRepetido = units.some(
    (u) =>
      u.id !== candidato.id && u.code.trim().toUpperCase() === candidato.code.trim().toUpperCase()
  );
  if (codigoRepetido) erros.push('Já existe uma unidade com este código.');

  for (const campo of ORG_LEVEL_FIELDS[candidato.level]) {
    if (campo.required && !(attrs[campo.key] || '').trim()) {
      erros.push(`${campo.label} é obrigatório.`);
    }
  }

  return erros;
}

export { ORG_LEVELS, ORG_PARENT_LEVEL };
