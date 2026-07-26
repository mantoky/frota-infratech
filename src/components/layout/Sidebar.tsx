'use client';

import { t } from '@/lib/hooks/useTranslations';
import { FilterType, PageType } from '@/types';
import { CSSProperties, useEffect } from 'react';
import {
  Truck,
  LayoutGrid,
  Check,
  Clock,
  Droplet,
  Wrench,
  Users,
  History,
  Settings,
  ShieldCheck,
  BarChart3,
  MessageSquare,
  MapPin,
  X,
} from 'lucide-react';

const FILTER_ICONS: Record<FilterType, typeof Check> = {
  all: LayoutGrid,
  disp: Check,
  uso: Clock,
  lav: Droplet,
  man: Wrench,
};

const FILTER_LABEL_KEY: Record<Exclude<FilterType, 'all'>, string> = {
  disp: 'statAvailable',
  uso: 'statInUse',
  lav: 'statWash',
  man: 'statMaintenance',
};

interface SidebarProps {
  currentPage: PageType;
  currentFilter: FilterType;
  sidebarOpen: boolean;
  currentLang: string;
  isAdmin: boolean;
  onNavigate: (page: PageType) => void;
  onFilterChange: (filter: FilterType) => void;
  onHistoryOpen: () => void;
  onClose: () => void;
}

export default function Sidebar({
  currentPage,
  currentFilter,
  sidebarOpen,
  currentLang,
  isAdmin,
  onNavigate,
  onFilterChange,
  onHistoryOpen,
  onClose,
}: SidebarProps) {
  // Esc fecha a gaveta no mobile. Sem isso o unico jeito de sair era acertar
  // o overlay com o dedo - ruim em tela pequena, pior ainda com luva.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen, onClose]);

  const styles: { [key: string]: CSSProperties } = {
    // Acima de 1024px a sidebar e coluna fixa (a classe .app-main--docked
    // reserva o espaco no conteudo); abaixo disso ela volta a ser gaveta.
    // A troca acontece em CSS, nao em JS - ver .app-sidebar em globals.css.
    // Escondemos por transform e nao por display:none pra nao tirar os itens
    // da ordem de tabulacao de forma inconsistente entre os dois modos.
    sidebar: {
      position: 'fixed',
      insetInlineStart: 0,
      top: 0,
      height: '100dvh',
      width: 'var(--sidebar-width)',
      backgroundColor: 'var(--bg-sidebar)',
      color: 'var(--text-light)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      overflow: 'hidden',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: '0 var(--space-4)',
      height: 'var(--topbar-height)',
      flexShrink: 0,
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    },
    groupLabel: {
      padding: 'var(--space-4) var(--space-5) var(--space-2)',
      fontSize: '0.66rem',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.42)',
      fontWeight: 700,
      letterSpacing: '0.11em',
      margin: 0,
    },
    item: {
      width: '100%',
      minHeight: 42,
      padding: '10px var(--space-5)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      // Longhand em todas as propriedades que o estado ativo tambem toca.
      // Misturar `background`/`backgroundColor` (ou `borderLeft`/
      // `borderLeftColor`) no mesmo elemento faz o React remover a shorthand
      // no rerender e a cor do item ativo simplesmente nao aplicar.
      backgroundColor: 'transparent',
      borderStyle: 'none',
      borderLeftStyle: 'solid',
      borderLeftWidth: '3px',
      borderLeftColor: 'transparent',
      color: 'rgba(255,255,255,0.72)',
      fontSize: '0.9rem',
      fontWeight: 550,
      textAlign: 'left',
      transition:
        'background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)',
    },
    itemActive: {
      backgroundColor: 'var(--bg-sidebar-active)',
      borderLeftColor: 'var(--brand-accent)',
      color: '#fff',
      fontWeight: 650,
    },
  };

  const item = (
    key: string,
    label: string,
    Icon: typeof LayoutGrid,
    active: boolean,
    onSelect: () => void,
    badge?: string
  ) => (
    <button
      key={key}
      type="button"
      aria-current={active ? 'page' : undefined}
      style={{ ...styles.item, ...(active ? styles.itemActive : null) }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'var(--bg-sidebar-hover)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent';
      }}
      onClick={() => {
        onSelect();
        onClose();
      }}
    >
      <Icon size={17} style={{ flexShrink: 0, opacity: active ? 1 : 0.8 }} />
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
      {badge && (
        <span
          style={{
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            padding: '2px 6px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--brand-accent)',
            color: '#1a1300',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );

  const filters: Exclude<FilterType, 'all'>[] = ['disp', 'uso', 'lav', 'man'];

  return (
    <>
      <aside
        id="app-sidebar"
        aria-label={t('sidebarTitle', currentLang)}
        style={styles.sidebar}
        className={sidebarOpen ? 'app-sidebar app-sidebar--open' : 'app-sidebar'}
      >
        <div style={styles.header}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-s)',
              background: 'linear-gradient(140deg, #00594c, #001f36)',
              flexShrink: 0,
            }}
          >
            <Truck size={19} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.015em' }}
            >
              {t('sidebarTitle', currentLang)}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '0.68rem',
                color: 'rgba(255,255,255,0.45)',
                letterSpacing: '0.04em',
              }}
            >
              {isAdmin ? 'Perfil administrador' : 'Perfil operacional'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="app-sidebar__close"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              width: 36,
              minHeight: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <nav
          className="hide-scrollbar"
          style={{ flex: 1, overflowY: 'auto', paddingBottom: 'var(--space-6)' }}
        >
          <p style={styles.groupLabel}>{t('menuMain', currentLang)}</p>
          {item(
            'dashboard',
            t('menuDashboard', currentLang),
            LayoutGrid,
            currentPage === 'dashboard',
            () => onNavigate('dashboard')
          )}
          {item('metrics', 'Métricas & Telemetria', BarChart3, currentPage === 'metrics', () =>
            onNavigate('metrics')
          )}
          {item('forum', 'Fórum Operacional', MessageSquare, currentPage === 'forum', () =>
            onNavigate('forum')
          )}
          {item('regionais', 'Regionais e Gerências', MapPin, currentPage === 'regionais', () =>
            onNavigate('regionais')
          )}

          <p style={styles.groupLabel}>{t('menuFilters', currentLang)}</p>
          {filters.map((filter) =>
            item(
              filter,
              t(FILTER_LABEL_KEY[filter], currentLang),
              FILTER_ICONS[filter],
              currentPage === 'dashboard' && currentFilter === filter,
              () => {
                onFilterChange(filter);
                onNavigate('dashboard');
              }
            )
          )}

          <p style={styles.groupLabel}>{t('menuReports', currentLang)}</p>
          {item('drivers', t('menuDrivers', currentLang), Users, currentPage === 'drivers', () =>
            onNavigate('drivers')
          )}
          {item('history', t('menuHistory', currentLang), History, false, onHistoryOpen)}

          <p style={styles.groupLabel}>{t('menuSystem', currentLang)}</p>
          {item(
            'settings',
            t('menuSettings', currentLang),
            Settings,
            currentPage === 'settings',
            () => onNavigate('settings')
          )}
          {isAdmin &&
            item(
              'admin',
              t('menuAdmin', currentLang),
              ShieldCheck,
              currentPage === 'admin',
              () => onNavigate('admin'),
              'ADM'
            )}
        </nav>

        <div
          style={{
            padding: 'var(--space-3) var(--space-5)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            fontSize: '0.68rem',
            color: 'rgba(255,255,255,0.38)',
            flexShrink: 0,
          }}
        >
          Frota Infratech · v1.2
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="app-sidebar__overlay"
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--bg-overlay)',
            zIndex: 999,
          }}
          onClick={onClose}
        />
      )}
    </>
  );
}
