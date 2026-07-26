'use client';

import { ReactNode } from 'react';
import { SemanticStatus, SEMANTIC_SOFT, SEMANTIC_TEXT } from '@/lib/statusColor';

interface AlertBannerProps {
  tone: SemanticStatus;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/**
 * Aviso de topo de pagina. Usa fundo tingido + texto colorido em vez do bloco
 * solido anterior: varios banners empilhados em cor cheia competiam com os
 * cards de dados e faziam a tela parecer um alarme permanente.
 * role="status" para que a mudanca seja anunciada sem interromper o usuario.
 */
export default function AlertBanner({ tone, title, description, icon, action }: AlertBannerProps) {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-s)',
        backgroundColor: SEMANTIC_SOFT[tone],
        border: `1px solid ${SEMANTIC_TEXT[tone]}33`,
        borderLeft: `4px solid ${SEMANTIC_TEXT[tone]}`,
        color: 'var(--text-primary)',
      }}
    >
      {icon && (
        <span style={{ color: SEMANTIC_TEXT[tone], display: 'flex', flexShrink: 0 }}>{icon}</span>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 650, fontSize: '0.9rem' }}>{title}</p>
        {description && (
          <p style={{ margin: '2px 0 0', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
