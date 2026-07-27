'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Vehicle, HistoryItem } from '@/types';
import { initialVehicles } from '@/lib/constants';

const BACKUP_KEY = 'frota_backup';

interface LocalBackup {
  vehicles: Vehicle[];
  history: HistoryItem[];
  drivers: string[];
  lastUpdated: string;
  synced: boolean;
}

function readBackup(): LocalBackup | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Error loading local backup:', e);
    return null;
  }
}

function writeBackup(
  vehicles: Vehicle[],
  history: HistoryItem[],
  drivers: string[],
  synced: boolean,
  lastUpdated?: string
) {
  const backup: LocalBackup = {
    vehicles,
    history,
    drivers,
    lastUpdated: lastUpdated || new Date().toISOString(),
    synced,
  };
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
  return backup;
}

/** Backfill org/timestamp fields for vehicles saved before regionais/métricas. */
function migrateVehicles(vehicles: Vehicle[]): { vehicles: Vehicle[]; changed: boolean } {
  const byTag = new Map(initialVehicles.map((v) => [v.tag, v]));
  const byId = new Map(initialVehicles.map((v) => [v.id, v]));
  let changed = false;
  const migrated = vehicles.map((v) => {
    const seed = byTag.get(v.tag) || byId.get(v.id);
    const next: Vehicle = { ...v };
    if (!next.regionalId && seed?.regionalId) {
      next.regionalId = seed.regionalId;
      changed = true;
    }
    if (!next.gerenciaId && seed?.gerenciaId) {
      next.gerenciaId = seed.gerenciaId;
      changed = true;
    }
    if (!next.lastStatusChangeAt && seed?.lastStatusChangeAt) {
      next.lastStatusChangeAt = seed.lastStatusChangeAt;
      changed = true;
    }
    if (!next.lastWashedAt && seed?.lastWashedAt) {
      next.lastWashedAt = seed.lastWashedAt;
      changed = true;
    }
    if (!next.regionalId) {
      next.regionalId = initialVehicles[0]?.regionalId;
      changed = true;
    }
    return next;
  });
  return { vehicles: migrated, changed };
}

// Camada de dados offline-first: o localStorage e a fonte primaria, sempre
// disponivel mesmo sem rede nenhuma (ex: rede corporativa que bloqueia o
// Firestore). O Firestore vira uma sincronizacao best-effort em segundo
// plano - tenta escrever, e se falhar so tenta de novo quando detectar que
// voltou a rede. Nao ha fila de multiplas pendencias porque cada escrita ja
// contem o estado completo (vehicles+history), entao a mais recente sempre
// supera qualquer tentativa anterior que ainda nao tenha sincronizado.
export function useFleetData() {
  // Comeca sempre vazio/carregando, identico no servidor e no primeiro
  // render do cliente - ler o localStorage direto no useState quebraria a
  // hidratacao (o HTML gerado no build nunca tem acesso a localStorage, mas
  // o primeiro render do navegador teria, gerando uma arvore diferente).
  // A leitura real acontece no primeiro useEffect abaixo, que roda logo
  // apos a montagem, sem esperar rede nenhuma.
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [drivers, setDrivers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const historyRef = useRef(history);
  const driversRef = useRef(drivers);
  const lastUpdatedRef = useRef('');

  // ---------------------------------------------------------------------
  // Trava de hidratacao — a correcao da perda de frota
  // ---------------------------------------------------------------------
  // Enquanto isto for `false`, NADA e escrito no Firestore. O motivo e um
  // caso real de perda de dados: ao abrir o app num dominio novo, o
  // localStorage esta vazio e o SDK do Firestore entrega primeiro um snapshot
  // vindo do cache local - tambem vazio - dizendo que o documento nao existe.
  // A versao anterior tratava isso como "primeira instalacao" e gravava a
  // frota de exemplo por cima do documento real, zerando junto `history` e
  // `drivers`. O estado do banco depois do incidente era exatamente esse:
  // historico e condutores vazios.
  //
  // Um snapshot de cache nao e resposta do servidor, e ausencia de resposta.
  // So depois que o servidor confirma e que sabemos se ha o que semear.
  const hidratadoRef = useRef(false);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  useEffect(() => {
    driversRef.current = drivers;
  }, [drivers]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- le o backup local apos a montagem; o HTML estatico e pre-renderizado sem acesso ao localStorage, entao isso precisa acontecer no cliente, e nao pode ir no useState (quebraria a hidratacao) */
    const backup = readBackup();
    if (backup) {
      const { vehicles: migrated, changed } = migrateVehicles(backup.vehicles || []);
      setVehicles(migrated);
      setHistory(backup.history);
      setDrivers(backup.drivers || []);
      lastUpdatedRef.current = backup.lastUpdated;
      // Backup local tambem e fonte autoritativa: sabemos o que o usuario
      // tinha, entao gravar deixa de ser arriscado mesmo antes do servidor
      // responder - e exatamente esse o ponto do offline-first.
      hidratadoRef.current = true;
      if (changed) {
        writeBackup(migrated, backup.history, backup.drivers || [], false, backup.lastUpdated);
      }
      setLoading(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const pushToFirestore = useCallback(
    async (
      newVehicles: Vehicle[],
      newHistory: HistoryItem[],
      newDrivers: string[],
      lastUpdated: string
    ) => {
      if (!hidratadoRef.current) {
        console.warn(
          'Escrita ignorada: os dados ainda nao foram carregados. Gravar agora sobrescreveria a frota real com um estado vazio.'
        );
        return;
      }
      try {
        // Firestore rejeita campos com valor undefined (ex: HistoryItem.location
        // quando a captura de GPS falha) - o round-trip por JSON remove essas
        // chaves, igual ao que ja acontece ao gravar no localStorage.
        const sanitizedVehicles = JSON.parse(JSON.stringify(newVehicles));
        const sanitizedHistory = JSON.parse(JSON.stringify(newHistory));
        await setDoc(
          doc(db, 'frota', 'data'),
          {
            vehicles: sanitizedVehicles,
            history: sanitizedHistory,
            drivers: newDrivers,
            lastUpdated,
            version: '2.0',
          },
          { merge: true }
        );
        writeBackup(newVehicles, newHistory, newDrivers, true, lastUpdated);
      } catch (e) {
        console.error(
          'Sincronizacao com Firestore falhou, tentando de novo quando a rede voltar',
          e
        );
      }
    },
    []
  );

  const saveData = useCallback(
    async (newVehicles: Vehicle[], newHistory: HistoryItem[]) => {
      const lastUpdated = new Date().toISOString();
      lastUpdatedRef.current = lastUpdated;
      // Grava local primeiro e sempre - o app funciona mesmo sem rede nenhuma.
      writeBackup(newVehicles, newHistory, driversRef.current, false, lastUpdated);
      await pushToFirestore(newVehicles, newHistory, driversRef.current, lastUpdated);
    },
    [pushToFirestore]
  );

  const saveDrivers = useCallback(
    async (newDrivers: string[]) => {
      setDrivers(newDrivers);
      driversRef.current = newDrivers;
      const lastUpdated = new Date().toISOString();
      lastUpdatedRef.current = lastUpdated;
      writeBackup(vehicles, historyRef.current, newDrivers, false, lastUpdated);
      await pushToFirestore(vehicles, historyRef.current, newDrivers, lastUpdated);
    },
    [pushToFirestore, vehicles]
  );

  // Tenta sincronizar o que ficou pendente: ao montar, e sempre que o
  // navegador detectar que a rede voltou.
  useEffect(() => {
    const retryPendingSync = () => {
      const backup = readBackup();
      if (backup && !backup.synced) {
        pushToFirestore(backup.vehicles, backup.history, backup.drivers || [], backup.lastUpdated);
      }
    };
    retryPendingSync();
    window.addEventListener('online', retryPendingSync);
    return () => window.removeEventListener('online', retryPendingSync);
  }, [pushToFirestore]);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'frota', 'data'),
      (docSnap) => {
        // Um snapshot de cache nao e resposta do servidor - e a ausencia
        // dela. Tratar "nao existe no cache" como "nao existe" foi o que
        // apagou a frota. Enquanto for cache, so aproveitamos o que ja veio
        // preenchido; nunca decidimos semear nem gravar nada.
        const doCache = docSnap.metadata.fromCache;

        if (docSnap.exists()) {
          const data = docSnap.data();
          const firestoreVehicles: Vehicle[] = data.vehicles || [];
          const firestoreHistory: HistoryItem[] = data.history || [];
          const firestoreDrivers: string[] = data.drivers || [];
          const firestoreLastUpdated: string = data.lastUpdated || '';

          // So aceita o dado remoto se for mais novo que o que ja temos local
          // - evita que um eco atrasado do Firestore sobrescreva uma edicao
          // offline mais recente.
          const isNewer =
            !lastUpdatedRef.current ||
            (firestoreLastUpdated && firestoreLastUpdated > lastUpdatedRef.current);

          if (isNewer && (firestoreVehicles.length > 0 || firestoreHistory.length > 0)) {
            const { vehicles: migrated } = migrateVehicles(firestoreVehicles);
            setVehicles(migrated);
            setHistory(firestoreHistory);
            setDrivers(firestoreDrivers);
            lastUpdatedRef.current = firestoreLastUpdated || new Date().toISOString();
            writeBackup(migrated, firestoreHistory, firestoreDrivers, true, lastUpdatedRef.current);
          }
        }

        if (!doCache) {
          const semeavel = !docSnap.exists() || (docSnap.data()?.vehicles || []).length === 0;
          // Semear so quando o SERVIDOR confirma que nao ha frota, e apenas
          // uma vez. `history` e `drivers` ficam de fora do payload: se um
          // dia existirem e a frota nao, escrever [] em cima os destruiria.
          if (semeavel && !hidratadoRef.current) {
            const agora = new Date().toISOString();
            setVehicles(initialVehicles);
            lastUpdatedRef.current = agora;
            hidratadoRef.current = true;
            writeBackup(initialVehicles, historyRef.current, driversRef.current, true, agora);
            setDoc(
              doc(db, 'frota', 'data'),
              {
                vehicles: initialVehicles,
                createdAt: agora,
                lastUpdated: agora,
                version: '2.0',
              },
              { merge: true }
            ).catch((e) => console.error('Falha ao semear a frota inicial', e));
          }
          hidratadoRef.current = true;
        }

        setLoading(false);
      },
      (error) => {
        console.error('Error fetching Firestore data:', error);
        // Sem resposta do servidor, o app segue no modo local. Liberamos a
        // gravacao apenas se ja havia backup - caso contrario continuamos
        // travados, que e o comportamento seguro.
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const addToHistory = useCallback(
    (
      vehicle: Vehicle,
      action: string,
      driver: string,
      km: number,
      extra: string,
      currentVehicles: Vehicle[],
      extraFields?: Partial<
        Pick<
          HistoryItem,
          | 'location'
          | 'distanceKm'
          | 'travelTimeMinutes'
          | 'photos'
          | 'customChecklistData'
          | 'regionalId'
          | 'gerenciaId'
        >
      >
    ) => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
      const newHistoryItem: HistoryItem = {
        id: `h-${Date.now()}`,
        date: dateStr,
        vehicle: `${vehicle.tag} (${vehicle.plate})`,
        driver,
        action,
        km,
        extra,
        regionalId: vehicle.regionalId,
        gerenciaId: vehicle.gerenciaId,
        ...extraFields,
      };
      const newHistory = [...historyRef.current, newHistoryItem];
      setHistory(newHistory);
      saveData(currentVehicles, newHistory);
    },
    [saveData]
  );

  return { vehicles, setVehicles, history, drivers, saveDrivers, loading, saveData, addToHistory };
}
