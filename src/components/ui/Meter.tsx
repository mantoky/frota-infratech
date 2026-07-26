'use client'

import { SemanticStatus, SEMANTIC_COLORS } from '@/lib/statusColor'

interface MeterProps {
  /** 0 a 100. Valores fora da faixa sao clampeados. */
  value: number
  tone: SemanticStatus
  label?: string
  /** Texto exibido a direita do label. Quando ausente, mostra o percentual.
   *  Existe porque o combustivel e cadastrado em fracoes ("Cheio", "3/4") e
   *  exibir "3/4" e mais fiel ao que o motorista viu no painel do que o 75%
   *  que a barra usa internamente. */
  valueLabel?: string
  /** Rotulo acessivel - obrigatorio quando nao ha label visivel. */
  ariaLabel?: string
  size?: 'sm' | 'md'
}

/**
 * Barra de nivel (combustivel, ocupacao). Usa role="progressbar" para que
 * leitores de tela anunciem o valor: uma div colorida sozinha nao comunica
 * nada a quem nao ve a cor - que e justamente o publico que mais precisa
 * do numero.
 */
export default function Meter({ value, tone, label, valueLabel, ariaLabel, size = 'md' }: MeterProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  const height = size === 'sm' ? 5 : 8

  return (
    <div>
      {label && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 'var(--space-1)',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
          }}
        >
          <span>{label}</span>
          <span className="tabular" style={{ fontWeight: 650, color: 'var(--text-primary)' }}>
            {valueLabel ?? `${Math.round(clamped)}%`}
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel || label}
        style={{
          backgroundColor: 'var(--bg-inset)',
          border: '1px solid var(--border-subtle)',
          height,
          borderRadius: 'var(--radius-pill)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clamped}%`,
            backgroundColor: SEMANTIC_COLORS[tone],
            borderRadius: 'var(--radius-pill)',
            transition: 'width var(--duration-base) var(--ease-out)',
          }}
        />
      </div>
    </div>
  )
}
