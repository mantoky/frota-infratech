'use client';

import { useId, useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// KPI poligonal
// ---------------------------------------------------------------------------
// Substitui a fileira de cards de indicador. Duas razoes praticas:
//
// 1. Os cards ocupavam uma faixa inteira da tela para mostrar cinco numeros e
//    nao filtravam nada - o filtro morava noutro lugar, com a mesma contagem.
//    Duas coisas iguais na mesma tela fazendo trabalhos diferentes.
// 2. Num poligono, os setores dividem o mesmo centro: le-se de relance que
//    sao partes de um todo, coisa que cinco retangulos lado a lado nao dizem.
//
// O numero de lados acompanha a quantidade de indicadores - cinco viram
// pentagono, seis hexagono, e assim ate o decagono. Cada setor e um botao de
// verdade (`role="radio"`), navegavel por teclado e anunciado por leitor de
// tela; o desenho e so a aparencia.

export interface KpiSegment<T extends string> {
  value: T;
  label: string;
  count: number;
  tone?: 'neutro' | 'ok' | 'alerta' | 'anormal';
}

interface KpiPolygonProps<T extends string> {
  segments: KpiSegment<T>[];
  active: T;
  onSelect: (value: T) => void;
  /** Numero grande no miolo. Normalmente o total da frota. */
  centerValue: number | string;
  centerLabel: string;
  ariaLabel: string;
  /** Lado do quadro em pixels. Compacto de proposito. */
  size?: number;
}

const TONE_FILL: Record<string, string> = {
  neutro: 'var(--brand-primary)',
  ok: 'var(--state-ok-solid)',
  alerta: 'var(--state-alert-solid)',
  anormal: 'var(--state-danger-solid)',
};

/** Vertice `i` de um poligono regular de `n` lados, com o primeiro no topo. */
function vertice(cx: number, cy: number, raio: number, i: number, n: number) {
  const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { x: cx + raio * Math.cos(ang), y: cy + raio * Math.sin(ang) };
}

/** Ponto medio angular do setor `i` — onde o rotulo fica centrado. */
function centroDoSetor(cx: number, cy: number, raio: number, i: number, n: number) {
  const ang = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
  return { x: cx + raio * Math.cos(ang), y: cy + raio * Math.sin(ang) };
}

export default function KpiPolygon<T extends string>({
  segments,
  active,
  onSelect,
  centerValue,
  centerLabel,
  ariaLabel,
  size = 260,
}: KpiPolygonProps<T>) {
  const uid = useId();
  const [hover, setHover] = useState<T | null>(null);

  const n = Math.max(3, Math.min(10, segments.length));
  const cx = size / 2;
  const cy = size / 2;
  const raio = size / 2 - 4;
  // O miolo vazado deixa o total legivel e evita que as pontas dos setores se
  // amontoem num vertice ilegivel no centro.
  const raioInterno = raio * 0.42;

  const setores = useMemo(
    () =>
      segments.slice(0, n).map((seg, i) => {
        const a = vertice(cx, cy, raio, i, n);
        const b = vertice(cx, cy, raio, i + 1, n);
        const ai = vertice(cx, cy, raioInterno, i, n);
        const bi = vertice(cx, cy, raioInterno, i + 1, n);
        const d = `M ${ai.x} ${ai.y} L ${a.x} ${a.y} L ${b.x} ${b.y} L ${bi.x} ${bi.y} Z`;
        const rotulo = centroDoSetor(cx, cy, (raio + raioInterno) / 2, i, n);
        return { seg, d, rotulo };
      }),
    [segments, n, cx, cy, raio, raioInterno]
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        flexWrap: 'wrap',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="radiogroup"
        aria-label={ariaLabel}
        style={{ flex: '0 0 auto', overflow: 'visible' }}
      >
        {setores.map(({ seg, d, rotulo }) => {
          const selecionado = seg.value === active;
          const realcado = selecionado || hover === seg.value;
          const cor = TONE_FILL[seg.tone || 'neutro'];
          return (
            <g
              key={seg.value}
              role="radio"
              aria-checked={selecionado}
              aria-label={`${seg.label}: ${seg.count}`}
              tabIndex={0}
              onClick={() => onSelect(seg.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(seg.value);
                }
              }}
              onMouseEnter={() => setHover(seg.value)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(seg.value)}
              onBlur={() => setHover(null)}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              <path
                d={d}
                fill={cor}
                fillOpacity={selecionado ? 0.95 : realcado ? 0.42 : 0.16}
                stroke="var(--bg-card)"
                strokeWidth={2}
                style={{ transition: 'fill-opacity var(--duration-fast) var(--ease-out)' }}
              />
              <text
                x={rotulo.x}
                y={rotulo.y - 4}
                textAnchor="middle"
                fontSize={size * 0.075}
                fontWeight={750}
                fill={selecionado ? '#fff' : 'var(--text-primary)'}
                style={{ pointerEvents: 'none' }}
              >
                {seg.count}
              </text>
              <text
                x={rotulo.x}
                y={rotulo.y + size * 0.055}
                textAnchor="middle"
                fontSize={size * 0.042}
                fontWeight={650}
                letterSpacing="0.02em"
                fill={selecionado ? 'rgba(255,255,255,0.92)' : 'var(--text-secondary)'}
                style={{ pointerEvents: 'none' }}
              >
                {seg.label.length > 11 ? `${seg.label.slice(0, 10)}…` : seg.label}
              </text>
            </g>
          );
        })}

        {/* Miolo: total da frota. Nao e clicavel - o "todos" e um setor como
            os outros, para nao existirem dois jeitos de limpar o filtro. */}
        <circle cx={cx} cy={cy} r={raioInterno - 2} fill="var(--bg-card)" />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fontSize={size * 0.13}
          fontWeight={800}
          fill="var(--text-primary)"
        >
          {centerValue}
        </text>
        <text
          x={cx}
          y={cy + size * 0.075}
          textAnchor="middle"
          fontSize={size * 0.04}
          fontWeight={650}
          letterSpacing="0.06em"
          fill="var(--text-muted)"
        >
          {centerLabel.toUpperCase()}
        </text>
      </svg>

      {/* Legenda textual. O poligono resume; a legenda nomeia sem abreviar e
          garante que a informacao exista fora do desenho. */}
      <ul
        aria-hidden="true"
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gap: 6,
          minWidth: 160,
        }}
      >
        {segments.slice(0, n).map((seg) => (
          <li
            key={`${uid}-${seg.value}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.82rem',
              color: seg.value === active ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: seg.value === active ? 700 : 500,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                backgroundColor: TONE_FILL[seg.tone || 'neutro'],
                opacity: seg.value === active ? 1 : 0.55,
                flex: '0 0 auto',
              }}
            />
            {seg.label}
            <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
              {seg.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
