import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import WithdrawModal from '@/components/modals/WithdrawModal';
import ReturnModal from '@/components/modals/ReturnModal';
import ServiceModal from '@/components/modals/ServiceModal';
import { captureLocation } from '@/lib/geolocation';
import type { ChecklistField, Vehicle } from '@/types';

jest.mock('@/lib/geolocation', () => ({
  captureLocation: jest.fn(() => Promise.resolve(null)),
}));

const captura = captureLocation as jest.Mock;

const checklist: ChecklistField[] = [
  {
    id: 'cinto',
    label: 'Cinto',
    category: 'Segurança',
    required: true,
    active: true,
  },
];

function veiculo(parcial: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 1,
    tag: 'TN01',
    plate: 'ABC1D23',
    model: 'Hilux',
    status: 'disp',
    km: 1000,
    fuel: 50,
    fuelText: '2/4',
    maintenance: 10000,
    driver: '',
    lastLocation: '',
    obs: '',
    ...parcial,
  };
}

function segurarLocalizacao() {
  let resolver: (ponto: null) => void = () => {};
  captura.mockImplementation(
    () =>
      new Promise<null>((resolve) => {
        resolver = resolve;
      })
  );
  return () => resolver(null);
}

describe('modais de operação', () => {
  beforeEach(() => {
    captura.mockReset();
    captura.mockImplementation(() => Promise.resolve(null));
  });

  it('reabre a retirada limpa no veículo novo', () => {
    const onConfirm = jest.fn();
    const { rerender } = render(
      <WithdrawModal
        isOpen
        onClose={jest.fn()}
        vehicle={veiculo()}
        currentLang="pt"
        drivers={['Ana']}
        checklistFields={checklist}
        onConfirm={onConfirm}
      />
    );

    fireEvent.change(screen.getByLabelText(/Nome do Motorista/), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cinto' }));
    expect(screen.getByLabelText(/Quilometragem Atual/)).toHaveValue(1000);

    rerender(
      <WithdrawModal
        isOpen={false}
        onClose={jest.fn()}
        vehicle={veiculo()}
        currentLang="pt"
        drivers={['Ana']}
        checklistFields={checklist}
        onConfirm={onConfirm}
      />
    );
    rerender(
      <WithdrawModal
        isOpen
        onClose={jest.fn()}
        vehicle={veiculo({ id: 2, tag: 'TN02', km: 2500 })}
        currentLang="pt"
        drivers={['Ana']}
        checklistFields={checklist}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByLabelText(/Nome do Motorista/)).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: 'Cinto' })).not.toBeChecked();
    expect(screen.getByLabelText(/Quilometragem Atual/)).toHaveValue(2500);
    expect(screen.getByRole('button', { name: 'Confirmar Retirada' })).toBeDisabled();
  });

  it('recusa quilometragem menor na devolução e não grava', () => {
    const onConfirm = jest.fn();
    render(
      <ReturnModal
        isOpen
        onClose={jest.fn()}
        vehicle={veiculo({ status: 'uso', km: 1000 })}
        currentLang="pt"
        onConfirm={onConfirm}
      />
    );

    const km = screen.getByLabelText(/Quilometragem Atual/);
    fireEvent.change(km, { target: { value: '900' } });
    fireEvent.invalid(km);
    expect(screen.getByText('KM não pode ser menor que o registrado!')).toBeInTheDocument();

    fireEvent.submit(km.closest('form')!);

    expect(screen.getByText('KM não pode ser menor que o registrado!')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(captura).not.toHaveBeenCalled();
  });

  it('recusa quilometragem menor no envio para serviço', () => {
    const onConfirm = jest.fn();
    render(
      <ServiceModal
        isOpen
        onClose={jest.fn()}
        vehicle={veiculo()}
        serviceType="man"
        currentLang="pt"
        onConfirm={onConfirm}
      />
    );

    fireEvent.change(screen.getByLabelText(/Nome do Motorista/), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/Quilometragem Atual/), { target: { value: '10' } });
    fireEvent.submit(screen.getByLabelText(/Quilometragem Atual/).closest('form')!);

    expect(screen.getByText('KM não pode ser menor que o registrado!')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('não herda condutor ao reabrir o serviço em outro veículo', () => {
    const onConfirm = jest.fn();
    const props = {
      onClose: jest.fn(),
      serviceType: 'lav' as const,
      currentLang: 'pt',
      onConfirm,
    };
    const { rerender } = render(<ServiceModal isOpen vehicle={veiculo()} {...props} />);

    fireEvent.change(screen.getByLabelText(/Nome do Motorista/), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/^Observações/), { target: { value: 'barulho' } });

    rerender(<ServiceModal isOpen={false} vehicle={veiculo()} {...props} />);
    rerender(<ServiceModal isOpen vehicle={veiculo({ id: 8, tag: 'TN08', km: 80 })} {...props} />);

    expect(screen.getByLabelText(/Nome do Motorista/)).toHaveValue('');
    expect(screen.getByLabelText(/^Observações/)).toHaveValue('');
    expect(screen.getByLabelText(/Quilometragem Atual/)).toHaveValue(80);
  });

  it('grava uma única retirada enquanto a localização ainda não voltou', async () => {
    const soltar = segurarLocalizacao();
    const onConfirm = jest.fn();
    render(
      <WithdrawModal
        isOpen
        onClose={jest.fn()}
        vehicle={veiculo()}
        currentLang="pt"
        drivers={[]}
        checklistFields={[]}
        onConfirm={onConfirm}
      />
    );

    fireEvent.change(screen.getByLabelText(/Nome do Motorista/), { target: { value: 'Ana' } });
    const form = screen.getByLabelText(/Quilometragem Atual/).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(await screen.findByRole('button', { name: 'Confirmando…' })).toBeDisabled();
    expect(captura).toHaveBeenCalledTimes(1);

    await act(async () => {
      soltar();
    });

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    fireEvent.submit(form);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ driver: 'Ana', km: 1000, location: null })
    );
  });

  it('não grava a devolução se o modal fecha durante a captura', async () => {
    const soltar = segurarLocalizacao();
    const onConfirm = jest.fn();
    const { rerender } = render(
      <ReturnModal
        isOpen
        onClose={jest.fn()}
        vehicle={veiculo({ status: 'uso' })}
        currentLang="pt"
        onConfirm={onConfirm}
      />
    );

    fireEvent.change(screen.getByLabelText(/Local de Devolução/), { target: { value: 'CCO' } });
    fireEvent.submit(screen.getByLabelText(/Quilometragem Atual/).closest('form')!);

    rerender(
      <ReturnModal
        isOpen={false}
        onClose={jest.fn()}
        vehicle={veiculo({ status: 'uso' })}
        currentLang="pt"
        onConfirm={onConfirm}
      />
    );

    await act(async () => {
      soltar();
    });

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
