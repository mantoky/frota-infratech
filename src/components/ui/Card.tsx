'use client'

import { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  /** 'flat' remove a sombra - usar quando o card ja esta dentro de outro card. */
  variant?: 'raised' | 'flat' | 'inset'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** Faixa colorida na borda esquerda, para status semantico. */
  accent?: string
  style?: CSSProperties
  className?: string
}

const PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  none: '0',
  sm: 'var(--space-3)',
  md: 'var(--space-5)',
  lg: 'var(--space-6)',
}

const VARIANT_CLASS: Record<NonNullable<CardProps['variant']>, string> = {
  raised: 'surface',
  flat: 'surface-flat',
  inset: 'surface-inset',
}

export default function Card({
  children,
  variant = 'raised',
  padding = 'md',
  accent,
  style,
  className,
}: CardProps) {
  return (
    <div
      className={[VARIANT_CLASS[variant], className].filter(Boolean).join(' ')}
      style={{
        padding: PADDING[padding],
        ...(accent ? { borderLeft: `4px solid ${accent}` } : null),
        ...style,
      }}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function CardHeader({ title, description, icon, action }: CardHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', minWidth: 0 }}>
        {icon && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: 'var(--radius-s)',
              backgroundColor: 'var(--brand-secondary-soft)',
              color: 'var(--brand-secondary)',
            }}
          >
            {icon}
          </span>
        )}
        <div style={{ minWidth: 0 }}>
          <h2 className="section-title">{title}</h2>
          {description && (
            <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {description}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}
