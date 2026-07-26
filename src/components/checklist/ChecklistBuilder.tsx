'use client'

import React, { useState } from 'react'
import { ChecklistField } from '@/types'
import { Plus, Trash2, CheckSquare } from 'lucide-react'

interface ChecklistBuilderProps {
  fields: ChecklistField[]
  isAdmin: boolean
  onSaveFields: (fields: ChecklistField[]) => void
}

export default function ChecklistBuilder({ fields, isAdmin, onSaveFields }: ChecklistBuilderProps) {
  const [localFields, setLocalFields] = useState(fields)
  const [newLabel, setNewLabel] = useState('')
  const [newCategory, setNewCategory] = useState<ChecklistField['category']>('Geral')

  const updateFieldLabel = (id: string, label: string) => {
    setLocalFields(prev => prev.map(f => f.id === id ? { ...f, label } : f))
  }

  const toggleActive = (id: string) => {
    setLocalFields(prev => prev.map(f => f.id === id ? { ...f, active: !f.active } : f))
  }

  const removeField = (id: string) => {
    setLocalFields(prev => prev.filter(f => f.id !== id))
  }

  const addField = () => {
    if (!newLabel.trim()) return
    const field: ChecklistField = {
      id: `chk-${Date.now()}`,
      label: newLabel.trim(),
      category: newCategory,
      required: true,
      active: true
    }
    setLocalFields(prev => [...prev, field])
    setNewLabel('')
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
      <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <CheckSquare size={18} /> Editor de Checklist (títulos editáveis)
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        Crie novos campos e edite os títulos usados na retirada de veículos.
      </p>

      <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
        {localFields.map(field => (
          <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
            <input
              value={field.label}
              disabled={!isAdmin}
              onChange={e => updateFieldLabel(field.id, e.target.value)}
              style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
            />
            <button type="button" onClick={() => toggleActive(field.id)} disabled={!isAdmin} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: field.active ? 'rgba(46,204,113,0.15)' : 'var(--bg-main)', cursor: 'pointer' }}>
              {field.active ? 'Ativo' : 'Inativo'}
            </button>
            {isAdmin && (
              <button type="button" onClick={() => removeField(field.id)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'rgba(231,76,60,0.15)', color: '#e74c3c', cursor: 'pointer' }}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: 8, marginBottom: 12 }}>
            <input placeholder="Novo campo do checklist" value={newLabel} onChange={e => setNewLabel(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }} />
            <select value={newCategory} onChange={e => setNewCategory(e.target.value as ChecklistField['category'])} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
              <option value="Segurança">Segurança</option>
              <option value="Eletrica">Elétrica</option>
              <option value="Mecânica">Mecânica</option>
              <option value="Documentação">Documentação</option>
              <option value="Geral">Geral</option>
            </select>
            <button type="button" onClick={addField} style={{ padding: '10px 14px', borderRadius: 8, border: 'none', background: 'var(--brand-secondary)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} /> Add
            </button>
          </div>
          <button type="button" onClick={() => onSaveFields(localFields)} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--brand-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Salvar Checklist
          </button>
        </>
      )}
    </div>
  )
}
