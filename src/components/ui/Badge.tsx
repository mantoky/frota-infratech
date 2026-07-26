'use client';

import { ReactNode } from 'react';
import { SemanticStatus, SEMANTIC_COLORS, SEMANTIC_SOFT, SEMANTIC_TEXT } from '@/lib/statusColor';

interface BadgeProps {
  children: ReactNode;
  tone?: SemanticStatus | 'neutral';
  /** 'solid' = fundo cheio + texto branco. 'soft' = fundo tingido + texto colorido. */
  variant?: 'solid' | 'soft';
  icon?: ReactNode;
  size?: 'sm' | 'md';
}

export default function Badge({
  children,
  tone = 'neutral',
  variant = 'soft',
  icon,
  size = 'md',
}: BadgeProps) {
  const isNeutral = tone === 'neutral';

  const palette = isNeutral
    ? variant === 'solid'
      ? { background: 'var(--brand-gray)', color: '#fff' }
      : { background: 'var(--bg-inset)', color: 'var(--text-secondary)' }
    : variant === 'solid'
      ? { background: SEMANTIC_COLORS[tone], color: '#fff' }
      : { background: SEMANTIC_SOFT[tone], color: SEMANTIC_TEXT[tone] };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: 'var(--radius-pill)',
        fontSize: size === 'sm' ? '0.65rem' : '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.045em',
        textTransform: 'uppercase',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
        ...palette,
      }}
    >
      {icon}
      {children}
    </span>
  );
}
