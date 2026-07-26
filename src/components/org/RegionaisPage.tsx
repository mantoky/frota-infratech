'use client'

import React, { useState } from 'react'
import { Regional, Gerencia, Vehicle } from '@/types'
import { MapPin, Building2, Plus, Truck } from 'lucide-react'

interface RegionaisPageProps {
  regionais: Regional[]
  gerencias: Gerencia[]
  vehicles: Vehicle[]
  isAdmin: boolean
  onCreateRegional: (data: { name: string; code: string; description: string }) => void
  onCreateGerencia: (data: { regionalId: string; name: string; code: string; responsible: string }) => void
}

export default function RegionaisPage({
  regionais,
  gerencias,
  vehicles,
  isAdmin,
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

  const handleCreateRegional = (e: React.FormEvent) => {
    e.preventDefault()
    if (!regName.trim() || !regCode.trim()) return
    onCreateRegional({ name: regName.trim(), code: regCode.trim().toUpperCase(), description: regDesc.trim() })
    setRegName('')
    setRegCode('')
    setRegDesc('')
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
    setGerName('')
    setGerCode('')
    setGerResp('')
    setShowGerenciaModal(false)
  }

  const activeRegional = selectedRegional || regionais[0]?.id
  const regionalGerencias = gerencias.filter(g => g.regionalId === activeRegional)
  const regionalVehicles = vehicles.filter(v => v.regionalId === activeRegional)

  return (
    <div style={{ padding: '25px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
        <div>
          <h1 className="page-title">Regionais e Guias de Gerência</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Estrutura organizacional da frota. Nova regional herda fluxo operacional e recebe 1 veículo standard automático.
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowRegionalModal(true)} style={{ backgroundColor: 'var(--brand-primary)', color: '#fff', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <Plus size={16} /> Nova Regional
            </button>
            <button onClick={() => setShowGerenciaModal(true)} style={{ backgroundColor: 'var(--brand-secondary)', color: '#fff', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <Plus size={16} /> Nova Gerência
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto' }}>
        {regionais.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedRegional(r.id)}
            style={{
              padding: '10px 16px', borderRadius: '10px', border: '2px solid',
              borderColor: activeRegional === r.id ? 'var(--brand-primary)' : 'var(--border)',
              backgroundColor: activeRegional === r.id ? 'rgba(0,46,77,0.08)' : 'var(--bg-card)',
              cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap'
            }}
          >
            <MapPin size={14} style={{ display: 'inline', marginRight: 6 }} />
            {r.name}
          </button>
        ))}
      </div>

      {regionais.filter(r => r.id === activeRegional).map(regional => (
        <div key={regional.id} style={{ display: 'grid', gap: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={20} color="var(--brand-primary)" /> {regional.name}
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px' }}>{regional.description || 'Sem descrição'}</p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.9rem' }}>
              <span><strong>Código:</strong> {regional.code}</span>
              <span><strong>Criada em:</strong> {regional.createdAt}</span>
              <span><strong>Veículos:</strong> {regionalVehicles.length}</span>
              <span><strong>Gerências:</strong> {regionalGerencias.length}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {regionalGerencias.map(g => {
              const gerVehicles = vehicles.filter(v => v.gerenciaId === g.id)
              return (
                <div key={g.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '18px', border: '1px solid var(--border)' }}>
                  <h3 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Building2 size={18} color="var(--brand-secondary)" /> {g.name}
                  </h3>
                  <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Código: {g.code}</p>
                  <p style={{ margin: '0 0 6px', fontSize: '0.85rem' }}>Responsável: <strong>{g.responsible}</strong></p>
                  <p style={{ margin: 0, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Truck size={14} /> {gerVehicles.length} veículo(s) vinculados
                  </p>
                </div>
              )
            })}
            {regionalGerencias.length === 0 && (
              <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Nenhuma gerência nesta regional.</div>
            )}
          </div>

          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0 }}>Veículos da Regional</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {regionalVehicles.map(v => (
                <div key={v.id} style={{ padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '8px', borderLeft: '4px solid var(--brand-primary)' }}>
                  <strong>{v.tag}</strong>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{v.model}</div>
                  <div style={{ fontSize: '0.8rem' }}>{v.plate} · {v.status}</div>
                </div>
              ))}
              {regionalVehicles.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Nenhum veículo nesta regional.</p>}
            </div>
          </div>
        </div>
      ))}

      {showRegionalModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <form onSubmit={handleCreateRegional} style={{ backgroundColor: 'var(--bg-card)', padding: 24, borderRadius: 12, width: '100%', maxWidth: 480, display: 'grid', gap: 12 }}>
            <h3 style={{ margin: 0 }}>Criar Nova Regional</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Será criado automaticamente 1 veículo standard (Toyota Hilux) vinculado à regional.
            </p>
            <input required placeholder="Nome da regional" value={regName} onChange={e => setRegName(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }} />
            <input required placeholder="Código (ex: REG-SUL)" value={regCode} onChange={e => setRegCode(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }} />
            <textarea placeholder="Descrição" value={regDesc} onChange={e => setRegDesc(e.target.value)} rows={3} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setShowRegionalModal(false)} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--brand-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Criar Regional</button>
            </div>
          </form>
        </div>
      )}

      {showGerenciaModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <form onSubmit={handleCreateGerencia} style={{ backgroundColor: 'var(--bg-card)', padding: 24, borderRadius: 12, width: '100%', maxWidth: 480, display: 'grid', gap: 12 }}>
            <h3 style={{ margin: 0 }}>Criar Guia de Gerência</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Herda a estrutura de cadastro/fluxo de veículos da plataforma.
            </p>
            <select required value={gerRegionalId} onChange={e => setGerRegionalId(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
              {regionais.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input required placeholder="Nome da gerência" value={gerName} onChange={e => setGerName(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }} />
            <input required placeholder="Código (ex: GER-OPS)" value={gerCode} onChange={e => setGerCode(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }} />
            <input placeholder="Responsável" value={gerResp} onChange={e => setGerResp(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setShowGerenciaModal(false)} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--brand-secondary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Criar Gerência</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
