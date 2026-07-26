'use client';

import React, { useState } from 'react';
import { Vehicle, HistoryItem } from '@/types';
import {
  calculateUsageRanking,
  calculateVehicleTimeMetrics,
  calculatePeakUsage,
  calculateKmRanking,
  extractObservationsTimeline,
  generateGrafanaMetrics,
} from '@/lib/metrics';
import {
  BarChart3,
  Clock,
  Wrench,
  Droplet,
  Flame,
  Award,
  FileText,
  Activity,
  Calendar,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { SEMANTIC_TEXT } from '@/lib/statusColor';
import PageHeader from '@/components/ui/PageHeader';

interface MetricsPageProps {
  vehicles: Vehicle[];
  history: HistoryItem[];
  currentLang: string;
}

export default function MetricsPage({ vehicles, history }: MetricsPageProps) {
  const [rankingPeriod, setRankingPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [copiedPrometheus, setCopiedPrometheus] = useState(false);

  const usageRanking = calculateUsageRanking(history, vehicles, rankingPeriod);
  const timeMetrics = calculateVehicleTimeMetrics(vehicles);
  const peakUsage = calculatePeakUsage(history);
  const kmRanking = calculateKmRanking(history, vehicles);
  const obsLogs = extractObservationsTimeline(history, vehicles);
  const grafanaData = generateGrafanaMetrics(vehicles, history);

  const maxPeakHourCount = Math.max(1, ...peakUsage.hours.map((h) => h.count));

  const handleCopyPrometheus = () => {
    navigator.clipboard.writeText(grafanaData.prometheus);
    setCopiedPrometheus(true);
    setTimeout(() => setCopiedPrometheus(false), 2500);
  };

  const handleDownloadPrometheus = () => {
    const blob = new Blob([grafanaData.prometheus], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grafana-metrics-infratech-${new Date().toISOString().split('T')[0]}.prom`;
    a.click();
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Inteligência operacional"
        title="Métricas de Uso e Telemetria da Frota"
        description="Indicadores operacionais de uso, tempo de inatividade, picos de saída e integração Grafana."
      />

      {/* Metric Cards Top */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '15px',
          marginBottom: '30px',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `5px solid ${SEMANTIC_TEXT.ok}`,
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              marginBottom: '8px',
            }}
          >
            <span>Veículos Ativos / Uso</span>
            <Activity size={18} color={SEMANTIC_TEXT.ok} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            {grafanaData.summary.uso} / {grafanaData.summary.total}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {Math.round((grafanaData.summary.uso / (grafanaData.summary.total || 1)) * 100)}% da
            frota em campo
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `5px solid ${SEMANTIC_TEXT.alerta}`,
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              marginBottom: '8px',
            }}
          >
            <span>Tempo Médio Parado (Idle)</span>
            <Clock size={18} color={SEMANTIC_TEXT.alerta} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            {Math.round(
              timeMetrics.reduce((acc, curr) => acc + curr.idleHours, 0) /
                (timeMetrics.filter((t) => t.idleHours > 0).length || 1)
            )}
            h
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Média de espera na área disponível
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `5px solid ${SEMANTIC_TEXT.anormal}`,
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              marginBottom: '8px',
            }}
          >
            <span>Na Oficina / Manutenção</span>
            <Wrench size={18} color={SEMANTIC_TEXT.anormal} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            {grafanaData.summary.man} veículo(s)
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Aguardando reparos operacionais
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `5px solid #3498db`,
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              marginBottom: '8px',
            }}
          >
            <span>Higienização / Lavador</span>
            <Droplet size={18} color="#3498db" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            {grafanaData.summary.lav} no lavador
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Padrão diário de sanitização
          </span>
        </div>
      </div>

      {/* SECTION 1: RANKING DE USO (Dia, Semana, Mês, Ano) */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '22px',
          marginBottom: '30px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
            marginBottom: '20px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <BarChart3 size={20} color="var(--brand-primary)" />
              Ranking de Uso de Veículos
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Classificação por quantidade de retiradas e quilometragem no período
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-main)',
              padding: '4px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}
          >
            {(['day', 'week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setRankingPeriod(p)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: rankingPeriod === p ? 'var(--brand-primary)' : 'transparent',
                  color: rankingPeriod === p ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                {p === 'day'
                  ? 'Hoje (Dia)'
                  : p === 'week'
                    ? 'Semana'
                    : p === 'month'
                      ? 'Mês'
                      : 'Ano'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.9rem',
            }}
          >
            <thead>
              <tr
                style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                <th style={{ padding: '12px 10px' }}>#</th>
                <th style={{ padding: '12px 10px' }}>Ativo (Tag)</th>
                <th style={{ padding: '12px 10px' }}>Modelo & Placa</th>
                <th style={{ padding: '12px 10px' }}>Retiradas</th>
                <th style={{ padding: '12px 10px' }}>KM Percorrido</th>
                <th style={{ padding: '12px 10px' }}>Tempo Ativo (Horas)</th>
              </tr>
            </thead>
            <tbody>
              {usageRanking.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                  }}
                >
                  <td style={{ padding: '12px 10px', fontWeight: 700 }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
                  </td>
                  <td
                    style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--brand-primary)' }}
                  >
                    {item.label}
                  </td>
                  <td style={{ padding: '12px 10px' }}>{item.sublabel}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <strong>{item.withdrawalsCount}</strong> saídas
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <strong>{item.totalKm.toLocaleString()}</strong> km
                  </td>
                  <td style={{ padding: '12px 10px' }}>{item.activeHours} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: TEMPO SEM USO / OFICINA / HIGIENIZAÇÃO */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '22px',
          marginBottom: '30px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
        }}
      >
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '5px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Clock size={20} color="var(--brand-secondary)" />
          Tempo de Inoperância e Estado do Veículo
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Monitoramento do tempo sem uso (estacionado em pátio), tempo acumulado em manutenção e
          dias sem higienização.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.9rem',
            }}
          >
            <thead>
              <tr
                style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                <th style={{ padding: '12px 10px' }}>Veículo</th>
                <th style={{ padding: '12px 10px' }}>Status</th>
                <th style={{ padding: '12px 10px' }}>Tempo Sem Uso (Parado)</th>
                <th style={{ padding: '12px 10px' }}>Tempo na Oficina</th>
                <th style={{ padding: '12px 10px' }}>Última Higienização</th>
              </tr>
            </thead>
            <tbody>
              {timeMetrics.map((item) => (
                <tr key={item.vehicleId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 10px', fontWeight: 700 }}>
                    {item.tag}{' '}
                    <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>
                      ({item.plate})
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        backgroundColor:
                          item.status === 'disp'
                            ? 'rgba(46,204,113,0.15)'
                            : item.status === 'uso'
                              ? 'rgba(52,152,219,0.15)'
                              : item.status === 'man'
                                ? 'rgba(231,76,60,0.15)'
                                : 'rgba(241,196,15,0.15)',
                        color:
                          item.status === 'disp'
                            ? SEMANTIC_TEXT.ok
                            : item.status === 'uso'
                              ? '#2980b9'
                              : item.status === 'man'
                                ? SEMANTIC_TEXT.anormal
                                : SEMANTIC_TEXT.alerta,
                      }}
                    >
                      {item.status === 'disp'
                        ? 'Disponível'
                        : item.status === 'uso'
                          ? 'Em Uso'
                          : item.status === 'man'
                            ? 'Oficina'
                            : 'Lavador'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    {item.idleHours > 0 ? (
                      <strong
                        style={{ color: item.idleHours > 48 ? SEMANTIC_TEXT.alerta : 'inherit' }}
                      >
                        {item.idleHours} horas
                      </strong>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    {item.workshopHours > 0 ? (
                      <strong style={{ color: SEMANTIC_TEXT.anormal }}>
                        {item.workshopHours} horas
                      </strong>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span
                      style={{ color: item.daysSinceWash > 14 ? SEMANTIC_TEXT.alerta : 'inherit' }}
                    >
                      {item.daysSinceWash === 0 ? 'Hoje' : `${item.daysSinceWash} dia(s) atrás`} (
                      {item.lastWashedFormatted})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3 & 4: PICO DE USO & RANKING DE KM */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '20px',
          marginBottom: '30px',
        }}
      >
        {/* Peak Hours Chart */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '22px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
          }}
        >
          <h2
            style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              marginBottom: '5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Flame size={20} color="#e67e22" />
            Pico de Uso por Horário (Saídas)
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Horários do dia com maior concentração de retiradas de veículos
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '4px',
              height: '160px',
              paddingTop: '20px',
            }}
          >
            {peakUsage.hours.map((h) => {
              const heightPercent = Math.round((h.count / maxPeakHourCount) * 100);
              return (
                <div
                  key={h.hourNumber}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}
                  >
                    {h.count > 0 ? h.count : ''}
                  </span>
                  <div
                    title={`${h.hourLabel}: ${h.count} saídas`}
                    style={{
                      width: '100%',
                      height: `${Math.max(6, heightPercent)}%`,
                      backgroundColor:
                        h.count === maxPeakHourCount && h.count > 0
                          ? '#e67e22'
                          : 'var(--brand-primary)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'all 0.3s',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.65rem',
                      color: 'var(--text-secondary)',
                      transform: 'rotate(-45deg)',
                      transformOrigin: 'top left',
                      marginTop: '4px',
                    }}
                  >
                    {h.hourNumber % 3 === 0 ? h.hourLabel : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* KM Ranking */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '22px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
          }}
        >
          <h2
            style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              marginBottom: '5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Award size={20} color="var(--brand-secondary)" />
            Ranking de Quilometragem
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Maiores rodagens por motorista e quilometragem atual do veículo
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <h4
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--brand-secondary)',
                  marginBottom: '10px',
                }}
              >
                👨‍✈️ Top Motoristas
              </h4>
              {kmRanking.drivers.slice(0, 5).map((d, i) => (
                <div
                  key={d.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.85rem',
                  }}
                >
                  <span>
                    {i + 1}. {d.name}
                  </span>
                  <strong>{d.km.toLocaleString()} km</strong>
                </div>
              ))}
              {kmRanking.drivers.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Sem histórico de viagens registrado.
                </p>
              )}
            </div>

            <div>
              <h4
                style={{ fontSize: '0.9rem', color: 'var(--brand-primary)', marginBottom: '10px' }}
              >
                🚘 Veículos Mais Rodados
              </h4>
              {kmRanking.vehicles.slice(0, 5).map((v, i) => (
                <div
                  key={v.tag}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.85rem',
                  }}
                >
                  <span>
                    {i + 1}. {v.tag}
                  </span>
                  <strong>{v.km.toLocaleString()} km</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: HISTÓRICO CONSOLIDADO DE OBSERVAÇÕES */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '22px',
          marginBottom: '30px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
        }}
      >
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '5px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <FileText size={20} color="var(--brand-primary)" />
          Histórico Consolidado de Observações e Notas de Campo
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Registro cronológico de observações inseridas em retiradas, devoluções e inspeções
        </p>

        <div style={{ display: 'grid', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
          {obsLogs.map((log) => (
            <div
              key={log.id}
              style={{
                borderLeft: '4px solid var(--brand-secondary)',
                backgroundColor: 'var(--bg-main)',
                padding: '12px 16px',
                borderRadius: '0 8px 8px 0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                }}
              >
                <span>
                  <strong>{log.vehicleTag}</strong> • {log.author} ({log.action})
                </span>
                <span>{log.date}</span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  fontStyle: 'italic',
                  color: 'var(--text-primary)',
                }}
              >
                &ldquo;{log.observation}&rdquo;
              </p>
            </div>
          ))}
          {obsLogs.length === 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Nenhuma observação registrada.
            </p>
          )}
        </div>
      </div>

      {/* SECTION 6: INTEGRAÇÃO GRAFANA & EXPORTAÇÃO PROMETHEUS */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '22px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
            marginBottom: '15px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Calendar size={20} color="#f39c12" />
              Integração Grafana & Exporter Prometheus
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Métricas formatadas nativamente para dashboards do Grafana, Datadog ou Prometheus
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCopyPrometheus}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copiedPrometheus ? <Check size={16} color={SEMANTIC_TEXT.ok} /> : <Copy size={16} />}
              {copiedPrometheus ? 'Copiado!' : 'Copiar Métricas'}
            </button>

            <button
              onClick={handleDownloadPrometheus}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--brand-primary)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Download size={16} />
              Exportar .prom
            </button>
          </div>
        </div>

        <pre
          style={{
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            maxHeight: '220px',
            overflowY: 'auto',
            fontFamily: 'monospace',
          }}
        >
          {grafanaData.prometheus}
        </pre>
      </div>
    </div>
  );
}
