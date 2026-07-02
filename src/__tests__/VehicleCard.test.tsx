import { render, screen, fireEvent } from '@testing-library/react'
import VehicleCard from '@/components/vehicles/VehicleCard'
import { Vehicle } from '@/types'

// Mock the translations
jest.mock('@/lib/hooks/useTranslations', () => ({
  t: (key: string, lang: string) => {
    const translations: Record<string, Record<string, string>> = {
      'lblMileage': { pt: 'Quilometragem' },
      'lblPlateLabel': { pt: 'Placa' },
      'lblNextMaintLabel': { pt: 'Prox. Manutencao' },
      'lblDriverLabel': { pt: 'Motorista' },
      'lblLastLocation': { pt: 'Ultimo Local' },
      'lblFuelLabel': { pt: 'COMBUSTIVEL:' },
      'btnWithdraw': { pt: 'Retirar' },
      'btnMaint': { pt: 'Manutencao' },
      'btnWash': { pt: 'Lavador' },
      'btnReturn': { pt: 'Devolver' },
      'btnEdit': { pt: 'Editar' },
      'maintIn': { pt: 'Manutencao em' },
      'none': { pt: 'Nenhum' },
      'statusAvailable': { pt: 'DISPONIVEL' },
      'statusInUse': { pt: 'EM USO' },
    }
    return translations[key]?.[lang] || key
  }
}))

describe('VehicleCard Component', () => {
  const mockVehicle: Vehicle = {
    id: 1,
    tag: 'TN-01',
    plate: 'FQQ8B72',
    model: 'VW Nivus',
    status: 'disp',
    km: 37449,
    fuel: 45,
    fuelText: '45%',
    maintenance: 40000,
    driver: '',
    lastLocation: 'Infratech',
    obs: ''
  }

  const mockHandlers = {
    onWithdraw: jest.fn(),
    onReturn: jest.fn(),
    onService: jest.fn(),
    onManage: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders vehicle information correctly', () => {
    render(
      <VehicleCard
        vehicle={mockVehicle}
        currentLang="pt"
        isAdmin={false}
        {...mockHandlers}
      />
    )

    expect(screen.getByText('TN-01')).toBeInTheDocument()
    expect(screen.getByText('VW Nivus')).toBeInTheDocument()
    expect(screen.getByText('FQQ8B72')).toBeInTheDocument()
  })

  it('shows withdraw button for available vehicles', () => {
    render(
      <VehicleCard
        vehicle={mockVehicle}
        currentLang="pt"
        isAdmin={false}
        {...mockHandlers}
      />
    )

    expect(screen.getByText('Retirar')).toBeInTheDocument()
    expect(screen.getByText('Manutencao')).toBeInTheDocument()
    expect(screen.getByText('Lavador')).toBeInTheDocument()
  })

  it('shows return button for vehicles in use', () => {
    const vehicleInUse: Vehicle = {
      ...mockVehicle,
      status: 'uso',
      driver: 'John Doe'
    }

    render(
      <VehicleCard
        vehicle={vehicleInUse}
        currentLang="pt"
        isAdmin={false}
        {...mockHandlers}
      />
    )

    expect(screen.getByText('Devolver')).toBeInTheDocument()
    expect(screen.queryByText('Retirar')).not.toBeInTheDocument()
  })

  it('calls onWithdraw when withdraw button is clicked', () => {
    render(
      <VehicleCard
        vehicle={mockVehicle}
        currentLang="pt"
        isAdmin={false}
        {...mockHandlers}
      />
    )

    fireEvent.click(screen.getByText('Retirar'))
    expect(mockHandlers.onWithdraw).toHaveBeenCalledWith(mockVehicle)
  })

  it('calls onManage when edit button is clicked', () => {
    render(
      <VehicleCard
        vehicle={mockVehicle}
        currentLang="pt"
        isAdmin={false}
        {...mockHandlers}
      />
    )

    fireEvent.click(screen.getByText('Editar'))
    expect(mockHandlers.onManage).toHaveBeenCalledWith(mockVehicle)
  })

  it('shows maintenance alert when vehicle is near maintenance', () => {
    const vehicleNearMaintenance: Vehicle = {
      ...mockVehicle,
      km: 39500,
      maintenance: 40000
    }

    render(
      <VehicleCard
        vehicle={vehicleNearMaintenance}
        currentLang="pt"
        isAdmin={false}
        {...mockHandlers}
      />
    )

    expect(screen.getByText(/Manutencao em/)).toBeInTheDocument()
  })

  it('displays correct fuel level', () => {
    render(
      <VehicleCard
        vehicle={mockVehicle}
        currentLang="pt"
        isAdmin={false}
        {...mockHandlers}
      />
    )

    expect(screen.getByText(/COMBUSTIVEL:/)).toBeInTheDocument()
    expect(screen.getByText(/45%/)).toBeInTheDocument()
  })
})