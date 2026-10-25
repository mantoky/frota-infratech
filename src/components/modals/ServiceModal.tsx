'use client';

import { useEffect, useRef, useState, FormEvent, CSSProperties } from 'react';
import { t } from '@/lib/hooks/useTranslations';
import { Vehicle } from '@/types';
import Modal from './Modal';
import { parseIntSafe } from '@/lib/helpers';
import { SEMANTIC_TEXT } from '@/lib/statusColor';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  serviceType: 'man' | 'lav';
  currentLang: string;
  onConfirm: (data: { driver: string; km: number; obs: string }) => void;
}

export default function ServiceModal({
  isOpen,
  onClose,
  vehicle,
  serviceType,
  currentLang,
  onConfirm,
}: ServiceModalProps) {
  const [driver, setDriver] = useState('');
  const [km, setKm] = useState('');
  const [obs, setObs] = useState('');
  const [kmError, setKmError] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [loadedKey, setLoadedKey] = useState<number | null>(null);
  const [ciclo, setCiclo] = useState(0);
  const submittingRef = useRef(false);
  const cicloRef = useRef(0);

  useEffect(() => {
    cicloRef.current = ciclo;
    submittingRef.current = false;
  }, [ciclo]);

  const openKey = isOpen && vehicle ? vehicle.id : null;
  if (openKey !== null && openKey !== loadedKey) {
    setLoadedKey(openKey);
    setCiclo((atual) => atual + 1);
    setEnviando(false);
    setDriver('');
    setKm(vehicle!.km.toString());
    setObs('');
    setKmError(false);
  } else if (openKey === null && loadedKey !== null) {
    setLoadedKey(null);
    setCiclo((atual) => atual + 1);
    setEnviando(false);
  }

  const styles: { [key: string]: CSSProperties } = {
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 600,
      color: 'var(--text-primary)',
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '2px solid var(--border)',
      borderRadius: '8px',
      backgroundColor: 'var(--bg-card)',
      color: 'var(--text-primary)',
      fontSize: '1rem',
    },
    textarea: {
      width: '100%',
      padding: '12px',
      border: '2px solid var(--border)',
      borderRadius: '8px',
      backgroundColor: 'var(--bg-card)',
      color: 'var(--text-primary)',
      fontSize: '1rem',
      minHeight: '100px',
      resize: 'vertical' as const,
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px',
    },
    button: {
      flex: 1,
      padding: '12px',
      border: 'none',
      borderRadius: '8px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.3s',
    },
    confirmButton: {
      backgroundColor: 'var(--brand-primary)',
      color: 'white',
    },
    cancelButton: {
      backgroundColor: 'var(--brand-gray)',
      color: 'white',
    },
    error: { color: SEMANTIC_TEXT.anormal, fontSize: '0.875rem', marginTop: '5px' },
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!vehicle || submittingRef.current) return;

    const kmValue = parseIntSafe(km, -1);
    if (kmValue < vehicle.km) {
      setKmError(true);
      return;
    }

    const cicloNoEnvio = ciclo;
    submittingRef.current = true;
    setEnviando(true);
    try {
      if (cicloNoEnvio !== cicloRef.current) return;
      onConfirm({
        driver,
        km: kmValue,
        obs,
      });
    } catch {
      if (cicloNoEnvio === cicloRef.current) {
        submittingRef.current = false;
        setEnviando(false);
      }
    }
  };

  if (!vehicle) return null;

  const title =
    serviceType === 'man'
      ? t('serviceTitleMaint', currentLang)
      : t('serviceTitleWash', currentLang);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <span style={styles.label}>{t('lblVehicle', currentLang)}</span>
          <p style={{ fontWeight: 600 }}>
            {vehicle.tag} - {vehicle.model}
          </p>
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="sv-f1" style={styles.label}>
            {t('lblDriver', currentLang)}
          </label>
          <input
            id="sv-f1"
            type="text"
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="sv-f2" style={styles.label}>
            {t('lblKm', currentLang)}
          </label>
          <input
            id="sv-f2"
            type="number"
            value={km}
            onChange={(e) => {
              setKm(e.target.value);
              setKmError(false);
            }}
            onInvalid={(e) => {
              e.preventDefault();
              setKmError(true);
            }}
            style={styles.input}
            min={vehicle.km}
            required
          />
          {kmError && <p style={styles.error}>{t('errorKm', currentLang)}</p>}
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="sv-f3" style={styles.label}>
            {t('lblObs', currentLang)}
          </label>
          <textarea
            id="sv-f3"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            style={styles.textarea}
          />
        </div>

        <div style={styles.buttonGroup}>
          <button
            type="button"
            onClick={onClose}
            style={{ ...styles.button, ...styles.cancelButton }}
          >
            {t('btnCancel', currentLang)}
          </button>
          <button
            type="submit"
            disabled={enviando}
            style={{
              ...styles.button,
              ...styles.confirmButton,
              ...(enviando ? { opacity: 0.45, cursor: 'not-allowed' } : {}),
            }}
          >
            {enviando ? t('btnConfirming', currentLang) : t('btnConfirmService', currentLang)}
          </button>
        </div>
      </form>
    </Modal>
  );
}
