'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Estado vazio explicito. Antes varias listas simplesmente nao renderizavam
 * nada quando estavam vazias, o que e indistinguivel de "a tela quebrou" -
 * especialmente em campo, com rede ruim.
 */
export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-10) var(--space-5)',
        gap: 'var(--space-2)',
      }}
    >
      {icon && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: 'var(--radius-m)',
            backgroundColor: 'var(--bg-inset)',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-2)',
          }}
        >
          {icon}
        </span>
      )}
      <p style={{ margin: 0, fontWeight: 650, color: 'var(--text-primary)' }}>{title}</p>
      {description && (
        <p
          style={{
            margin: 0,
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            maxWidth: '42ch',
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 'var(--space-3)' }}>{action}</div>}
    </div>
  );
}
