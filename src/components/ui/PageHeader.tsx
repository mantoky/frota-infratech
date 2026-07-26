'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  /** Rotulo curto de contexto acima do titulo (ex: "Operacao", "Governanca"). */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Botoes de acao primaria da pagina. Ficam a direita no desktop e
   *  descem pra baixo do texto no mobile. */
  actions?: ReactNode;
  /** Faixa de indicadores/abas logo abaixo do cabecalho. */
  meta?: ReactNode;
}

/**
 * Cabecalho unico de pagina. Antes cada tela montava o proprio h1 + paragrafo
 * com margens diferentes, o que fazia o topo "pular" alguns pixels ao navegar
 * entre Dashboard, Metricas e Regionais.
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: PageHeaderProps) {
  return (
    <header style={{ marginBottom: 'var(--space-6)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          {eyebrow && (
            <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>
              {eyebrow}
            </p>
          )}
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-subtitle">{description}</p>}
        </div>
        {actions && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>{actions}</div>
        )}
      </div>
      {meta && <div style={{ marginTop: 'var(--space-5)' }}>{meta}</div>}
    </header>
  );
}
