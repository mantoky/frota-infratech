'use client'

import { SemanticStatus, SEMANTIC_SOFT, SEMANTIC_TEXT } from '@/lib/statusColor'

export interface FilterChipOption<T extends string> {
  value: T
  label: string
  count?: number
  tone?: SemanticStatus | 'neutral'
}

interface FilterChipsProps<T extends string> {
  options: FilterChipOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Rotulo do grupo para leitores de tela. */
  ariaLabel: string
}

/**
 * Grupo de filtros mutuamente exclusivos. Implementado como radiogroup em vez
 * de divs clicaveis: assim navega por Tab/setas e o estado selecionado e
 * anunciado, coisa que a versao anterior (divs com onClick) nao fazia.
 */
export default function FilterChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: FilterChipsProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="hide-scrollbar"
      style={{
        display: 'flex',
        gap: 'var(--space-2)',
        overflowX: 'auto',
        paddingBottom: 2,
      }}
    >
      {options.map(option => {
        const selected = option.value === value
        const tone = option.tone ?? 'neutral'
        const accent = tone === 'neutral' ? 'var(--brand-primary)' : SEMANTIC_TEXT[tone]
        const accentSoft = tone === 'neutral' ? 'var(--brand-primary-soft)' : SEMANTIC_SOFT[tone]

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              height: 40,
              minHeight: 40,
              padding: '0 var(--space-4)',
              borderRadius: 'var(--radius-pill)',
              border: `1px solid ${selected ? accent : 'var(--border)'}`,
              backgroundColor: selected ? accentSoft : 'var(--bg-card)',
              color: selected ? accent : 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 650,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all var(--duration-fast) var(--ease-out)',
            }}
          >
            {option.label}
            {typeof option.count === 'number' && (
              <span
                className="tabular"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: selected ? accent : 'var(--bg-inset)',
                  color: selected ? '#fff' : 'var(--text-muted)',
                }}
              >
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
