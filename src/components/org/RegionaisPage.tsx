'use client'

import React, { useMemo, useState } from 'react'
import { Regional, Gerencia, Vehicle } from '@/types'
import { MapPin, Building2, Plus, Truck, UserRound, Hash, CalendarDays } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Card, { CardHeader } from '@/components/ui/Card'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/modals/Modal'
import { getVehicleSemanticStatus, getStatusLabelKey } from '@/lib/statusColor'
import { t } from '@/lib/hooks/useTranslations'

interface RegionaisPageProps {
  regionais: Regional[]
  gerencias: Gerencia[]
  vehicles: Vehicle[]
  isAdmin: boolean
  currentLang?: string
  onCreateRegional: (data: { name: string; code: string; description: string }) => void
  onCreateGerencia: (data: { regionalId: string; name: string; code: string; responsible: string }) => void
}

export default function RegionaisPage({
  regionais,
  gerencias,
  vehicles,
  isAdmin,
  currentLang = 'pt',
  onCreateRegional,
  onCreateGerencia
}: RegionaisPageProps) {
  const [showRegionalModal, setShowRegionalModal] = useState(false)
  const [showGerenciaModal, setShowGerenciaModal] = useState(false)
  const [selectedRegional, setSelectedRegional] = useState(regionais[0]?.id || '')

  const [regName, setRegName] = useState('')
  const [regCode, setRegCode] = useState('')
  const [regDesc, setRegDesc] = useState('')

  const [gerName, setGerName] = useState('')
  const [gerCode, setGerCode] = useState('')
  const [gerResp, setGerResp] = useState('')
  const [gerRegionalId, setGerRegionalId] = useState(regionais[0]?.id || '')

  const activeRegionalId = selectedRegional || regionais[0]?.id
  const regional = regionais.find(r => r.id === activeRegionalId)

  const regionalGerencias = useMemo(
    () => gerencias.filter(g => g.regionalId === activeRegionalId),
    [gerencias, activeRegionalId]
  )
  const regionalVehicles = useMemo(
    () => vehicles.filter(v => v.regionalId === activeRegionalId),
    [vehicles, activeRegionalId]
  )

  // Veiculos da regional que nao estao vinculados a nenhuma gerencia. Sao
  // exatamente os que escapam de qualquer auditoria setorial, entao precisam
  // aparecer explicitamente e nao diluidos no total.
  const unassignedVehicles = useMemo(
    () => regionalVehicles.filter(v => !v.gerenciaId || !regionalGerencias.some(g => g.id === v.gerenciaId)),
    [regionalVehicles, regionalGerencias]
  )

  const handleCreateRegional = (e: React.FormEvent) => {
    e.preventDefault()
    if (!regName.trim() || !regCode.trim()) return
    onCreateRegional({ name: regName.trim(), code: regCode.trim().toUpperCase(), description: regDesc.trim() })
    setRegName(''); setRegCode(''); setRegDesc('')
    setShowRegionalModal(false)
  }

  const handleCreateGerencia = (e: React.FormEvent) => {
    e.preventDefault()
    if (!gerName.trim() || !gerCode.trim() || !gerRegionalId) return
    onCreateGerencia({
      regionalId: gerRegionalId,
      name: gerName.trim(),
      code: gerCode.trim().toUpperCase(),
      responsible: gerResp.trim() || 'A definir'
    })
    setGerName(''); setGerCode(''); setGerResp('')
    setShowGerenciaModal(false)
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Governança"
        title="Regionais e Gerências"
        description="Estrutura organizacional da frota. Cada regional concentra suas gerências, e cada gerência responde pelos veículos vinculados a ela."
        actions={
          isAdmin && (
            <>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowGerenciaModal(true)}>
                <Plus size={15} /> Nova gerência
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowRegionalModal(true)}>
                <Plus size={15} /> Nova regional
              </button>
            </>
          )
        }
      />

      {/* Seletor de regional. Vira "tabs" horizontais roláveis porque a
          expectativa e crescer para dezenas de regionais - uma lista vertical
          empurraria o conteudo pra baixo da dobra. */}
      <div
        role="tablist"
        aria-label="Selecionar regional"
        className="hide-scrollbar"
        style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', overflowX: 'auto', paddingBottom: 2 }}
      >
        {regionais.map(r => {
          const selected = activeRegionalId === r.id
          return (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setSelectedRegional(r.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                height: 42,
                padding: '0 var(--space-4)',
                borderRadius: 'var(--radius-s)',
                border: `1px solid ${selected ? 'var(--brand-primary)' : 'var(--border)'}`,
                backgroundColor: selected ? 'var(--brand-primary-soft)' : 'var(--bg-card)',
                color: selected ? 'var(--brand-primary)' : 'var(--text-secondary)',
                fontWeight: 650,
                fontSize: '0.88rem',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all var(--duration-fast) var(--ease-out)',
              }}
            >
              <MapPin size={15} />
              {r.name}
            </button>
          )
        })}
      </div>

      {!regional ? (
        <Card>
          <EmptyState
            icon={<MapPin size={24} />}
            title="Nenhuma regional cadastrada"
            description="Cadastre a primeira regional para começar a estruturar a frota por área de atuação."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
            <StatCard label="Veículos na regional" value={regionalVehicles.length} icon={<Truck size={17} />} />
            <StatCard label="Gerências" value={regionalGerencias.length} icon={<Building2 size={17} />} />
            <StatCard
              label="Sem gerência"
              value={unassignedVehicles.length}
              hint={unassignedVehicles.length ? 'Fora de auditoria setorial' : 'Toda a frota está vinculada'}
              icon={<Hash size={17} />}
              tone={unassignedVehicles.length ? 'alerta' : 'ok'}
            />
            <StatCard
              label="Criada em"
              value={<span style={{ fontSize: '1.15rem' }}>{regional.createdAt}</span>}
              hint={`Código ${regional.code}`}
              icon={<CalendarDays size={17} />}
            />
          </div>

          <Card>
            <CardHeader
              title={regional.name}
              description={regional.description || 'Sem descrição cadastrada.'}
              icon={<MapPin size={18} />}
              action={<Badge tone="neutral">{regional.code}</Badge>}
            />
          </Card>

          <section>
            <h2 className="section-title" style={{ marginBottom: 'var(--space-3)' }}>
              Gerências e setores
            </h2>
            {regionalGerencias.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Building2 size={24} />}
                  title="Nenhuma gerência nesta regional"
                  description="Sem gerência cadastrada, os veículos ficam sem responsável setorial definido para auditoria."
                  action={
                    isAdmin && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowGerenciaModal(true)}>
                        <Plus size={15} /> Criar gerência
                      </button>
                    )
                  }
                />
              </Card>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
                {regionalGerencias.map(g => {
                  const gerVehicles = vehicles.filter(v => v.gerenciaId === g.id)
                  return (
                    <Card key={g.id} padding="md">
                      <CardHeader
                        title={g.name}
                        description={`Código ${g.code}`}
                        icon={<Building2 size={18} />}
                      />
                      <div style={{ display: 'grid', gap: 'var(--space-2)', fontSize: '0.85rem' }}>
                        <p style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: 'var(--text-secondary)' }}>
                          <UserRound size={14} />
                          Responsável: <strong style={{ color: 'var(--text-primary)' }}>{g.responsible}</strong>
                        </p>
                        <p style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: 'var(--text-secondary)' }}>
                          <Truck size={14} />
                          <strong style={{ color: 'var(--text-primary)' }}>{gerVehicles.length}</strong>
                          {gerVehicles.length === 1 ? 'veículo vinculado' : 'veículos vinculados'}
                        </p>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="section-title" style={{ marginBottom: 'var(--space-3)' }}>
              Veículos da regional
            </h2>
            <Card padding={regionalVehicles.length ? 'md' : 'none'}>
              {regionalVehicles.length === 0 ? (
                <EmptyState
                  icon={<Truck size={24} />}
                  title="Nenhum veículo nesta regional"
                  description="Veículos cadastrados aparecem aqui assim que forem vinculados a esta regional."
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 'var(--space-2)' }}>
                  {regionalVehicles.map(v => {
                    const gerencia = regionalGerencias.find(g => g.id === v.gerenciaId)
                    return (
                      <div
                        key={v.id}
                        className="surface-inset"
                        style={{ padding: 'var(--space-3)', display: 'grid', gap: 6 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: '0.92rem' }}>{v.tag}</strong>
                          <Badge tone={getVehicleSemanticStatus(v)} size="sm">
                            {t(getStatusLabelKey(v), currentLang)}
                          </Badge>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {v.model} · {v.plate}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: gerencia ? 'var(--text-muted)' : 'var(--state-alert)' }}>
                          {gerencia ? gerencia.name : 'Sem gerência vinculada'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </section>
        </div>
      )}

      <Modal
        isOpen={showRegionalModal}
        onClose={() => setShowRegionalModal(false)}
        title="Criar nova regional"
        maxWidth="500px"
      >
        <form onSubmit={handleCreateRegional} style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            A regional é criada com 1 veículo standard (Toyota Hilux) vinculado automaticamente.
          </p>
          <div>
            <label htmlFor="reg-name" className="field-label">Nome da regional</label>
            <input id="reg-name" className="field" required placeholder="Ex.: Regional Sul" value={regName} onChange={e => setRegName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="reg-code" className="field-label">Código</label>
            <input id="reg-code" className="field" required placeholder="Ex.: REG-SUL" value={regCode} onChange={e => setRegCode(e.target.value)} />
          </div>
          <div>
            <label htmlFor="reg-desc" className="field-label">Descrição</label>
            <textarea id="reg-desc" className="field" rows={3} placeholder="Área de atuação e escopo operacional" value={regDesc} onChange={e => setRegDesc(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowRegionalModal(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Criar regional</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showGerenciaModal}
        onClose={() => setShowGerenciaModal(false)}
        title="Criar gerência"
        maxWidth="500px"
      >
        <form onSubmit={handleCreateGerencia} style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            A gerência herda o fluxo de cadastro e operação de veículos da plataforma.
          </p>
          <div>
            <label htmlFor="ger-regional" className="field-label">Regional</label>
            <select id="ger-regional" className="field" required value={gerRegionalId} onChange={e => setGerRegionalId(e.target.value)}>
              {regionais.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ger-name" className="field-label">Nome da gerência</label>
            <input id="ger-name" className="field" required placeholder="Ex.: Gerência de Operações" value={gerName} onChange={e => setGerName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ger-code" className="field-label">Código</label>
            <input id="ger-code" className="field" required placeholder="Ex.: GER-OPS" value={gerCode} onChange={e => setGerCode(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ger-resp" className="field-label">Responsável</label>
            <input id="ger-resp" className="field" placeholder="Nome do gestor responsável" value={gerResp} onChange={e => setGerResp(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowGerenciaModal(false)}>Cancelar</button>
            <button type="submit" className="btn btn-secondary">Criar gerência</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
