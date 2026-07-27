import { renderHook, act, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Regressao: a frota que desapareceu
// ---------------------------------------------------------------------------
// O que aconteceu, em ordem: o app foi aberto num dominio novo, entao o
// localStorage estava vazio. O SDK do Firestore entrega primeiro um snapshot
// vindo do cache local - tambem vazio - dizendo que o documento nao existe.
// A versao anterior lia isso como "primeira instalacao" e gravava a frota de
// exemplo por cima do documento real, levando junto `history` e `drivers`.
//
// Estes testes travam as duas condicoes que impedem a repeticao:
//   1. nada e escrito enquanto a resposta vier do cache;
//   2. a semeadura nunca inclui `history` nem `drivers`.

jest.mock('@/lib/firebase', () => ({ db: {} }));

type SnapshotFake = {
  exists: () => boolean;
  data: () => Record<string, unknown>;
  metadata: { fromCache: boolean };
};

const setDoc = jest.fn(() => Promise.resolve());
let emitir: ((snap: SnapshotFake) => void) | null = null;

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  setDoc: (...args: unknown[]) => setDoc(...(args as [])),
  onSnapshot: jest.fn((_ref: unknown, onNext: (snap: SnapshotFake) => void) => {
    emitir = onNext;
    return () => {};
  }),
}));

import { useFleetData } from '@/lib/hooks/useFleetData';

const snapshot = (
  fromCache: boolean,
  data: Record<string, unknown> | null = null
): SnapshotFake => ({
  exists: () => data !== null,
  data: () => data || {},
  metadata: { fromCache },
});

beforeEach(() => {
  localStorage.clear();
  setDoc.mockClear();
  emitir = null;
});

describe('useFleetData — proteção contra sobrescrever a frota real', () => {
  it('um snapshot de cache dizendo "não existe" não semeia nem grava nada', async () => {
    renderHook(() => useFleetData());

    act(() => {
      emitir!(snapshot(true, null));
    });

    // Isto e o coracao da correcao: cache dizendo "vazio" e ausencia de
    // resposta, nao resposta negativa.
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('recusa gravar antes de saber o que já existe', async () => {
    const { result } = renderHook(() => useFleetData());

    act(() => {
      emitir!(snapshot(true, null));
    });

    await act(async () => {
      await result.current.saveData([], []);
    });

    expect(setDoc).not.toHaveBeenCalled();
  });

  it('só semeia quando o servidor confirma, e sem tocar em history nem drivers', async () => {
    renderHook(() => useFleetData());

    act(() => {
      emitir!(snapshot(false, null));
    });

    await waitFor(() => expect(setDoc).toHaveBeenCalled());

    const payload = setDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(Array.isArray(payload.vehicles)).toBe(true);
    expect((payload.vehicles as unknown[]).length).toBeGreaterThan(0);
    // Se `history: []` voltar para este payload, o incidente volta junto.
    expect(payload).not.toHaveProperty('history');
    expect(payload).not.toHaveProperty('drivers');
    expect(payload).toHaveProperty('lastUpdated');
  });

  it('quando o servidor tem frota, ela é adotada e nada é sobrescrito', async () => {
    const { result } = renderHook(() => useFleetData());

    const remota = [
      {
        id: 99,
        tag: 'TN-99',
        plate: 'AAA1A11',
        model: 'Hilux',
        status: 'disp',
        km: 10,
        fuel: 50,
        fuelText: '50%',
        maintenance: 20000,
        driver: '',
        lastLocation: '',
        obs: '',
        regionalId: 'reg-carajas',
      },
    ];

    act(() => {
      emitir!(
        snapshot(false, {
          vehicles: remota,
          history: [{ date: 'x', vehicle: 'y', driver: '', action: 'a', km: 1, extra: '' }],
          drivers: ['Alguém'],
          lastUpdated: '2026-07-27T01:00:00.000Z',
        })
      );
    });

    await waitFor(() => expect(result.current.vehicles).toHaveLength(1));
    expect(result.current.vehicles[0].tag).toBe('TN-99');
    expect(result.current.drivers).toEqual(['Alguém']);
    expect(setDoc).not.toHaveBeenCalled();
  });
});
