'use client';

import React, { useMemo, useState } from 'react';
import { OrgUnit, OrgLevel, Vehicle, ORG_LEVELS, ORG_LEVEL_LABEL, ORG_PARENT_LEVEL } from '@/types';
import { ORG_LEVEL_FIELDS, descendentesDe, filhosDe, podeExcluir, validarUnidade } from '@/lib/org';
import { Building2, ChevronRight, Plus, Trash2, Truck, Layers } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Card, { CardHeader } from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/modals/Modal';
import { NovaUnidade } from '@/lib/hooks/useOrgData';

// ---------------------------------------------------------------------------
// Governanca — Regional > Gerencia > Coordenacao > Gestao > Area
// ---------------------------------------------------------------------------
// A tela e uma navegacao em colunas, uma por nivel, e nao uma arvore recolhivel.
// Com cinco niveis, uma arvore vira uma escada de indentacao que no celular
// nao cabe; em colunas, cada passo mostra so o que interessa e o caminho fica
// visivel o tempo todo na trilha do topo.

interface OrgPageProps {
  units: OrgUnit[];
  vehicles: Vehicle[];
  isAdmin: boolean;
  onCreate: (dados: NovaUnidade) => void;
  onDelete: (id: string) => void;
}

/** Campo do veiculo que aponta para cada nivel. */
const CAMPO_DO_VEICULO: Record<OrgLevel, keyof Vehicle> = {
  regional: 'regionalId',
  gerencia: 'gerenciaId',
  coordenacao: 'coordenacaoId',
  gestao: 'gestaoId',
  area: 'areaId',
};

export default function OrgPage({ units, vehicles, isAdmin, onCreate, onDelete }: OrgPageProps) {
  // Um id selecionado por nivel. `null` significa "nada escolhido ainda".
  const [selecao, setSelecao] = useState<Record<OrgLevel, string | null>>({
    regional: null,
    gerencia: null,
    coordenacao: null,
    gestao: null,
    area: null,
  });

  const [modalLevel, setModalLevel] = useState<OrgLevel | null>(null);
  const [form, setForm] = useState<{ name: string; code: string; attrs: Record<string, string> }>({
    name: '',
    code: '',
    attrs: {},
  });
  const [erros, setErros] = useState<string[]>([]);

  const selecionar = (level: OrgLevel, id: string) => {
    // Escolher um no invalida tudo que estava selecionado abaixo dele -
    // manter a selecao antiga mostraria filhos de outro pai, o que e a forma
    // mais facil de alguem cadastrar coisa no lugar errado.
    const idx = ORG_LEVELS.indexOf(level);
    setSelecao((prev) => {
      const proximo = { ...prev, [level]: prev[level] === id ? null : id };
      for (let i = idx + 1; i < ORG_LEVELS.length; i += 1) proximo[ORG_LEVELS[i]] = null;
      return proximo;
    });
  };

  /** Quantos veiculos estao pendurados nesta unidade ou abaixo dela. */
  const contarVeiculos = useMemo(() => {
    return (unit: OrgUnit) => {
      const sub = new Set(descendentesDe(units, unit.id).map((u) => u.id));
      return vehicles.filter((v) =>
        ORG_LEVELS.some((lvl) => {
          const id = v[CAMPO_DO_VEICULO[lvl]];
          return typeof id === 'string' && sub.has(id);
        })
      ).length;
    };
  }, [units, vehicles]);

  const colunas = ORG_LEVELS.map((level, i) => {
    const paiLevel = ORG_PARENT_LEVEL[level];
    const paiId = paiLevel ? selecao[paiLevel] : null;
    const habilitada = !paiLevel || !!paiId;
    return {
      level,
      indice: i,
      habilitada,
      paiId,
      itens: habilitada ? filhosDe(units, paiLevel ? paiId : null) : [],
    };
  });

  const trilhaSelecionada = ORG_LEVELS.map((l) => units.find((u) => u.id === selecao[l])).filter(
    Boolean
  ) as OrgUnit[];

  const abrirModal = (level: OrgLevel) => {
    setForm({ name: '', code: '', attrs: {} });
    setErros([]);
    setModalLevel(level);
  };

  const submeter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalLevel) return;
    const paiLevel = ORG_PARENT_LEVEL[modalLevel];
    const parentId = paiLevel ? selecao[paiLevel] : null;
    const problemas = validarUnidade(
      units,
      { level: modalLevel, name: form.name, code: form.code, parentId },
      form.attrs
    );
    if (problemas.length) {
      setErros(problemas);
      return;
    }
    onCreate({ level: modalLevel, name: form.name, code: form.code, parentId, attrs: form.attrs });
    setModalLevel(null);
  };

  const tentarExcluir = (unit: OrgUnit) => {
    const { ok, motivo } = podeExcluir(units, unit.id);
    if (!ok) {
      window.alert(motivo);
      return;
    }
    if (window.confirm(`Excluir "${unit.name}"? Esta ação não pode ser desfeita.`)) {
      onDelete(unit.id);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Governança"
        title="Estrutura organizacional"
        description="Regional › Gerência › Coordenação › Gestão › Área. Cada nível tem atributos próprios e responde pela frota vinculada a ele e às unidades abaixo."
        meta={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 'var(--space-3)',
            }}
          >
            {ORG_LEVELS.map((level) => (
              <StatCard
                key={level}
                label={ORG_LEVEL_LABEL[level].plural}
                value={units.filter((u) => u.level === level).length}
                icon={<Layers size={16} />}
              />
            ))}
          </div>
        }
      />

      {/* Trilha: onde estou na árvore. Sem ela, cinco colunas com nomes
          parecidos deixam de ser navegação e viram adivinhação. */}
      {trilhaSelecionada.length > 0 && (
        <nav
          aria-label="Caminho selecionado"
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 'var(--space-4)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          {trilhaSelecionada.map((u, i) => (
            <React.Fragment key={u.id}>
              {i > 0 && <ChevronRight size={14} aria-hidden="true" />}
              <span style={{ fontWeight: i === trilhaSelecionada.length - 1 ? 700 : 500 }}>
                {u.name}
              </span>
            </React.Fragment>
          ))}
        </nav>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-3)',
          alignItems: 'start',
        }}
      >
        {colunas.map(({ level, habilitada, itens }) => (
          <Card key={level} padding="none">
            {/* O card nao tem padding para que a lista encoste nas bordas -
                por isso o cabecalho carrega o seu proprio. */}
            <div style={{ padding: 'var(--space-4) var(--space-4) 0' }}>
              <CardHeader
                title={ORG_LEVEL_LABEL[level].plural}
                action={
                  isAdmin && habilitada ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => abrirModal(level)}
                    >
                      <Plus size={14} /> Nova
                    </button>
                  ) : undefined
                }
              />
            </div>

            {!habilitada ? (
              <p
                style={{
                  margin: 0,
                  padding: 'var(--space-5)',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                }}
              >
                Selecione uma {ORG_LEVEL_LABEL[ORG_PARENT_LEVEL[level]!].singular.toLowerCase()}{' '}
                para ver as {ORG_LEVEL_LABEL[level].plural.toLowerCase()}.
              </p>
            ) : itens.length === 0 ? (
              <EmptyState
                icon={<Building2 size={20} />}
                title={`Nenhuma ${ORG_LEVEL_LABEL[level].singular.toLowerCase()}`}
                description={
                  isAdmin ? 'Use o botão acima para cadastrar.' : 'Nada cadastrado aqui ainda.'
                }
              />
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {itens.map((u) => {
                  const ativo = selecao[level] === u.id;
                  const qtd = contarVeiculos(u);
                  return (
                    <li key={u.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'stretch' }}>
                        <button
                          type="button"
                          onClick={() => selecionar(level, u.id)}
                          aria-pressed={ativo}
                          style={{
                            flex: 1,
                            textAlign: 'left',
                            padding: 'var(--space-3) var(--space-4)',
                            border: 'none',
                            borderLeftStyle: 'solid',
                            borderLeftWidth: 3,
                            borderLeftColor: ativo ? 'var(--brand-primary)' : 'transparent',
                            backgroundColor: ativo ? 'var(--brand-primary-soft)' : 'transparent',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              display: 'block',
                              fontWeight: ativo ? 700 : 600,
                              fontSize: '0.88rem',
                            }}
                          >
                            {u.name}
                          </span>
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginTop: 2,
                              fontSize: '0.74rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <span>{u.code}</span>
                            {qtd > 0 && (
                              <span
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
                              >
                                <Truck size={11} /> {qtd}
                              </span>
                            )}
                          </span>
                          {/* Atributos próprios do nível. É o que diferencia
                              uma coordenação de uma gestão além do nome. */}
                          {ORG_LEVEL_FIELDS[level]
                            .filter((f) => (u.attrs?.[f.key] || '').trim())
                            .slice(0, 2)
                            .map((f) => (
                              <span
                                key={f.key}
                                style={{
                                  display: 'block',
                                  marginTop: 2,
                                  fontSize: '0.74rem',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                {f.label}: {u.attrs[f.key]}
                              </span>
                            ))}
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => tentarExcluir(u)}
                            aria-label={`Excluir ${u.name}`}
                            style={{
                              padding: '0 var(--space-3)',
                              border: 'none',
                              background: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ))}
      </div>

      <Modal
        isOpen={modalLevel !== null}
        onClose={() => setModalLevel(null)}
        title={modalLevel ? `Nova ${ORG_LEVEL_LABEL[modalLevel].singular}` : ''}
        description={
          modalLevel && ORG_PARENT_LEVEL[modalLevel]
            ? `Será vinculada a: ${
                units.find((u) => u.id === selecao[ORG_PARENT_LEVEL[modalLevel]!])?.name || '—'
              }`
            : 'Unidade de topo da árvore.'
        }
      >
        {modalLevel && (
          <form onSubmit={submeter} style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div>
              <label className="field-label" htmlFor="org-nome">
                Nome
              </label>
              <input
                id="org-nome"
                className="field"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={`Nome da ${ORG_LEVEL_LABEL[modalLevel].singular.toLowerCase()}`}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="org-codigo">
                Código
              </label>
              <input
                id="org-codigo"
                className="field"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="Identificador curto e único"
              />
            </div>

            {ORG_LEVEL_FIELDS[modalLevel].map((campo) => (
              <div key={campo.key}>
                <label className="field-label" htmlFor={`org-${campo.key}`}>
                  {campo.label}
                  {campo.required ? ' *' : ''}
                </label>
                <input
                  id={`org-${campo.key}`}
                  className="field"
                  value={form.attrs[campo.key] || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, attrs: { ...f.attrs, [campo.key]: e.target.value } }))
                  }
                  placeholder={campo.placeholder}
                  aria-describedby={campo.hint ? `org-${campo.key}-hint` : undefined}
                />
                {campo.hint && (
                  <p
                    id={`org-${campo.key}-hint`}
                    style={{
                      margin: '4px 0 0',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {campo.hint}
                  </p>
                )}
              </div>
            ))}

            {erros.length > 0 && (
              <ul
                role="alert"
                style={{
                  margin: 0,
                  paddingLeft: '1.1rem',
                  color: 'var(--state-danger)',
                  fontSize: '0.85rem',
                }}
              >
                {erros.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button type="button" className="btn btn-outline" onClick={() => setModalLevel(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Cadastrar
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
