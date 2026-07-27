'use client';

import { t } from '@/lib/hooks/useTranslations';
import { FilterType, Vehicle } from '@/types';
import { CSSProperties, useMemo, useState } from 'react';
import VehicleMiniCard from '@/components/vehicles/VehicleMiniCard';
import VehicleDetailModal from '@/components/vehicles/VehicleDetailModal';
import PageHeader from '@/components/ui/PageHeader';
import KpiPolygon, { KpiSegment } from '@/components/ui/KpiPolygon';
import AlertBanner from '@/components/ui/AlertBanner';
import EmptyState from '@/components/ui/EmptyState';
import { AlertTriangle, Ban, Search, X, SearchX } from 'lucide-react';

interface DashboardPageProps {
  vehicles: Vehicle[];
  currentFilter: FilterType;
  currentLang: string;
  isAdmin: boolean;
  onFilterChange: (filter: FilterType) => void;
  onWithdraw: (vehicle: Vehicle) => void;
  onReturn: (vehicle: Vehicle) => void;
  onService: (type: 'man' | 'lav', vehicle: Vehicle) => void;
  onManage: (vehicle: Vehicle) => void;
}

const getTagNumber = (tag: string) => {
  const match = tag.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

export default function DashboardPage({
  vehicles,
  currentFilter,
  currentLang,
  isAdmin,
  onFilterChange,
  onWithdraw,
  onReturn,
  onService,
  onManage,
}: DashboardPageProps) {
  const [search, setSearch] = useState('');
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);

  const styles: { [key: string]: CSSProperties } = {
    toolbar: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      flexWrap: 'wrap',
      marginBottom: 'var(--space-5)',
    },
    searchBar: {
      position: 'relative',
      flex: '1 1 280px',
      maxWidth: '380px',
    },
    vehiclesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: 'var(--space-3)',
    },
  };

  const counts = useMemo(
    () => ({
      all: vehicles.length,
      disp: vehicles.filter((v) => v.status === 'disp').length,
      uso: vehicles.filter((v) => v.status === 'uso').length,
      lav: vehicles.filter((v) => v.status === 'lav').length,
      man: vehicles.filter((v) => v.status === 'man').length,
      mobilizacao: vehicles.filter((v) => v.status === 'mobilizacao').length,
      blocked: vehicles.filter((v) => v.blocked).length,
    }),
    [vehicles]
  );

  const maintenanceAlerts = useMemo(
    () =>
      vehicles.filter((v) => {
        const remaining = v.maintenance - v.km;
        return remaining >= 0 && remaining <= 1000;
      }),
    [vehicles]
  );

  const searchQuery = search.trim().toLowerCase();

  const visibleVehicles = useMemo(() => {
    const sorted = [...vehicles].sort((a, b) => getTagNumber(a.tag) - getTagNumber(b.tag));
    const byStatus =
      currentFilter === 'all' ? sorted : sorted.filter((v) => v.status === currentFilter);
    if (!searchQuery) return byStatus;
    return byStatus.filter(
      (v) =>
        v.tag.toLowerCase().includes(searchQuery) ||
        v.plate.toLowerCase().includes(searchQuery) ||
        v.model.toLowerCase().includes(searchQuery) ||
        (v.driver || '').toLowerCase().includes(searchQuery)
    );
  }, [vehicles, currentFilter, searchQuery]);

  // Cinco indicadores viram um pentagono; se um dia entrar um sexto status, o
  // componente vira hexagono sozinho. Cada setor filtra - o indicador e o
  // controle passaram a ser a mesma coisa, em vez de dois lugares mostrando a
  // mesma contagem.
  const segments: KpiSegment<FilterType>[] = [
    { value: 'all', label: t('statAll', currentLang), count: counts.all, tone: 'neutro' },
    { value: 'disp', label: t('statAvailable', currentLang), count: counts.disp, tone: 'ok' },
    { value: 'uso', label: t('statInUse', currentLang), count: counts.uso, tone: 'neutro' },
    { value: 'lav', label: t('statWash', currentLang), count: counts.lav, tone: 'alerta' },
    { value: 'man', label: t('statMaintenance', currentLang), count: counts.man, tone: 'anormal' },
  ];

  // Percentual de frota efetivamente utilizavel agora: o gestor pergunta
  // "quantos carros eu tenho pra dar?", nao "quantos carros existem".
  const availabilityRate = counts.all > 0 ? Math.round((counts.disp / counts.all) * 100) : 0;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Operação"
        title={t('dashboardTitle', currentLang)}
        description={t('dashboardSubtitle', currentLang)}
        meta={
          <KpiPolygon
            segments={segments}
            active={currentFilter}
            onSelect={onFilterChange}
            centerValue={counts.all}
            centerLabel={`${availabilityRate}% disponível`}
            ariaLabel="Filtrar frota por situação"
            size={248}
          />
        }
      />

      {(maintenanceAlerts.length > 0 || counts.blocked > 0) && (
        <div style={{ display: 'grid', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
          {maintenanceAlerts.length > 0 && (
            <AlertBanner
              tone="alerta"
              icon={<AlertTriangle size={17} />}
              title={t('maintenanceAlert', currentLang)}
              description={maintenanceAlerts.map((v) => v.tag).join(', ')}
            />
          )}
          {counts.blocked > 0 && (
            <AlertBanner
              tone="anormal"
              icon={<Ban size={17} />}
              title={`${counts.blocked} ${counts.blocked === 1 ? 'veículo bloqueado' : 'veículos bloqueados'}`}
              description={vehicles
                .filter((v) => v.blocked)
                .map((v) => v.tag)
                .join(', ')}
            />
          )}
        </div>
      )}

      <div style={styles.toolbar}>
        <div style={styles.searchBar}>
          <Search
            size={17}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 'var(--space-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="search"
            className="field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder', currentLang)}
            aria-label={t('searchPlaceholder', currentLang)}
            style={{
              paddingLeft: 'calc(var(--space-3) * 2 + 17px)',
              paddingRight: search ? 40 : undefined,
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpar busca"
              style={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 32,
                height: 32,
                minHeight: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Contagem do resultado: sem ela, um filtro que devolve 2 de 13
          veiculos parece que a tela nao carregou o resto. */}
      <p
        aria-live="polite"
        style={{
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          margin: '0 0 var(--space-3)',
        }}
      >
        {visibleVehicles.length} de {counts.all} {counts.all === 1 ? 'veículo' : 'veículos'}
        {searchQuery && ` para “${search.trim()}”`}
      </p>

      {visibleVehicles.length === 0 ? (
        <div className="surface">
          <EmptyState
            icon={<SearchX size={24} />}
            title="Nenhum veículo encontrado"
            description={
              searchQuery
                ? 'Tente outra tag, placa, modelo ou nome de condutor.'
                : 'Nenhum veículo nesta situação no momento.'
            }
            action={
              (searchQuery || currentFilter !== 'all') && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setSearch('');
                    onFilterChange('all');
                  }}
                >
                  Limpar filtros
                </button>
              )
            }
          />
        </div>
      ) : (
        <div style={styles.vehiclesGrid}>
          {visibleVehicles.map((vehicle) => (
            <VehicleMiniCard
              key={vehicle.id}
              vehicle={vehicle}
              currentLang={currentLang}
              onClick={() => setDetailVehicle(vehicle)}
            />
          ))}
        </div>
      )}

      <VehicleDetailModal
        vehicle={detailVehicle}
        isOpen={!!detailVehicle}
        onClose={() => setDetailVehicle(null)}
        currentLang={currentLang}
        isAdmin={isAdmin}
        onWithdraw={onWithdraw}
        onReturn={onReturn}
        onService={onService}
        onManage={onManage}
      />
    </div>
  );
}
