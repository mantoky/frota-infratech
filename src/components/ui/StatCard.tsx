'use client';

import { ReactNode } from 'react';
import { SemanticStatus, SEMANTIC_SOFT, SEMANTIC_TEXT } from '@/lib/statusColor';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: SemanticStatus | 'neutral';
  /** Torna o card clicavel (usado como filtro no Dashboard). */
  onClick?: () => void;
  active?: boolean;
}

/**
 * Indicador numerico do topo das paginas. O numero vem antes do rotulo na
 * hierarquia visual porque em painel operacional a leitura e por varredura:
 * o gestor procura o valor, nao o texto.
 */
export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  onClick,
  active = false,
}: StatCardProps) {
  const accent = tone === 'neutral' ? 'var(--brand-primary)' : SEMANTIC_TEXT[tone];
  const accentSoft = tone === 'neutral' ? 'var(--brand-primary-soft)' : SEMANTIC_SOFT[tone];

  const content = (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)',
        }}
      >
        <span className="eyebrow" style={{ minWidth: 0 }}>
          {label}
        </span>
        {icon && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: 'var(--radius-s)',
              backgroundColor: accentSoft,
              color: accent,
            }}
          >
            {icon}
          </span>
        )}
      </div>
      <div
        className="tabular"
        style={{
          fontSize: '1.75rem',
          fontWeight: 750,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)',
        }}
      >
        {value}
      </div>
      {hint && (
        <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {hint}
        </p>
      )}
    </>
  );

  const baseStyle = {
    padding: 'var(--space-4) var(--space-5)',
    textAlign: 'left' as const,
    width: '100%',
    borderTop: `3px solid ${active ? accent : 'transparent'}`,
  };

  if (!onClick) {
    return (
      <div className="surface" style={baseStyle}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="surface-interactive"
      style={{ ...baseStyle, cursor: 'pointer', display: 'block' }}
    >
      {content}
    </button>
  );
}
