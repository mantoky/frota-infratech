'use client';

import { useState, FormEvent, CSSProperties } from 'react';
import { t } from '@/lib/hooks/useTranslations';
import { Lock, ChevronDown, Download, Truck, AlertCircle, ArrowRight } from 'lucide-react';
import { SEMANTIC_TEXT, SEMANTIC_SOFT } from '@/lib/statusColor';

interface LoginScreenProps {
  currentLang: string;
  error: boolean;
  onEnterCommon: () => void;
  onEnterAdmin: (pin: string) => void;
  canInstall: boolean;
  onInstall: () => void;
}

export default function LoginScreen({
  currentLang,
  error,
  onEnterCommon,
  onEnterAdmin,
  canInstall,
  onInstall,
}: LoginScreenProps) {
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [pin, setPin] = useState('');

  const styles: { [key: string]: CSSProperties } = {
    page: {
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)',
      // Fundo com profundidade sutil: dois brilhos de marca bem diluidos
      // sobre a cor base. Da um ar corporativo sem virar papel de parede.
      backgroundColor: 'var(--bg-main)',
      backgroundImage:
        'radial-gradient(60rem 40rem at 15% -10%, var(--brand-secondary-soft), transparent 60%),' +
        'radial-gradient(50rem 35rem at 110% 110%, var(--brand-primary-soft), transparent 55%)',
    },
    card: {
      width: '100%',
      maxWidth: '400px',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-l)',
      padding: 'var(--space-8)',
      boxShadow: 'var(--shadow-lg)',
    },
    logo: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 54,
      height: 54,
      borderRadius: 'var(--radius-m)',
      background: 'linear-gradient(140deg, #00594c, #001f36)',
      color: '#fff',
      marginBottom: 'var(--space-5)',
    },
    pinInput: {
      width: '100%',
      padding: 'var(--space-3)',
      border: `1px solid ${error ? SEMANTIC_TEXT.anormal : 'var(--border-strong)'}`,
      borderRadius: 'var(--radius-s)',
      backgroundColor: 'var(--bg-inset)',
      color: 'var(--text-primary)',
      fontSize: '1.35rem',
      textAlign: 'center',
      letterSpacing: '0.6em',
      textIndent: '0.6em',
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
    },
  };

  const handleAdminSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      onEnterAdmin(pin);
      setPin('');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <span style={styles.logo}>
          <Truck size={26} />
        </span>

        <p className="eyebrow" style={{ marginBottom: 'var(--space-1)' }}>
          Infratech
        </p>
        <h1
          style={{
            fontSize: '1.55rem',
            fontWeight: 750,
            letterSpacing: '-0.026em',
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Gestão de Frota
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.92rem',
            lineHeight: 1.5,
            margin: 'var(--space-2) 0 var(--space-6)',
          }}
        >
          {t('loginSubtitle', currentLang)}
        </p>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: '100%' }}
          onClick={onEnterCommon}
        >
          {t('btnEnter', currentLang)}
          <ArrowRight size={17} />
        </button>

        {canInstall && (
          <button
            type="button"
            className="btn btn-outline"
            style={{ width: '100%', marginTop: 'var(--space-2)' }}
            onClick={onInstall}
          >
            <Download size={16} />
            {t('btnInstallApp', currentLang)}
          </button>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            margin: 'var(--space-5) 0 var(--space-2)',
          }}
        >
          <span style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
          <span className="eyebrow">ou</span>
          <span style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          style={{ width: '100%' }}
          onClick={() => setShowAdminForm(!showAdminForm)}
          aria-expanded={showAdminForm}
          aria-controls="admin-pin-form"
        >
          <Lock size={15} />
          {t('btnAdminAccess', currentLang)}
          <ChevronDown
            size={16}
            style={{
              transform: showAdminForm ? 'rotate(180deg)' : 'none',
              transition: 'transform var(--duration-base) var(--ease-out)',
            }}
          />
        </button>

        {showAdminForm && (
          <form
            id="admin-pin-form"
            onSubmit={handleAdminSubmit}
            style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-s)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
            }}
          >
            <label htmlFor="admin-pin" className="field-label" style={{ textAlign: 'center' }}>
              PIN de administrador
            </label>
            <input
              id="admin-pin"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={styles.pinInput}
              placeholder="••••"
              maxLength={4}
              autoFocus
              required
              aria-invalid={error}
              aria-describedby={error ? 'admin-pin-error' : undefined}
            />
            {error && (
              <p
                id="admin-pin-error"
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  margin: 'var(--space-2) 0 0',
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: SEMANTIC_SOFT.anormal,
                  color: SEMANTIC_TEXT.anormal,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={14} />
                {t('pinError', currentLang)}
              </p>
            )}
            {/* Rotulo distinto do botao de entrada comum. Dois botoes "Entrar"
                na mesma tela sao indistinguiveis por leitor de tela e por
                navegacao por voz. */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 'var(--space-3)' }}
              disabled={pin.length < 4}
            >
              {t('btnEnterAdmin', currentLang)}
            </button>
          </form>
        )}
      </div>

      <p
        style={{
          marginTop: 'var(--space-6)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        Uso restrito a colaboradores autorizados · Atividades são registradas
      </p>
    </div>
  );
}
