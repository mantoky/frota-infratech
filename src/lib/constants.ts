import { Vehicle } from '@/types'

export const initialVehicles: Vehicle[] = [
  { id: 1, tag: 'TN-01', plate: 'FQQ8B72', model: 'VW Nivus', status: 'disp', km: 37449, fuel: 45, fuelText: '45%', maintenance: 40000, driver: '', lastLocation: '', obs: '' },
  { id: 2, tag: 'TN-03', plate: 'TCD7H75', model: 'Toyota Hilux', status: 'disp', km: 37310, fuel: 75, fuelText: '75%', maintenance: 40000, driver: '', lastLocation: 'Nucleo', obs: '' },
  { id: 3, tag: 'TN-04', plate: 'TDM2E37', model: 'Toyota Hilux', status: 'uso', km: 31816, fuel: 100, fuelText: '100%', maintenance: 35000, driver: 'Robson', lastLocation: '', obs: '' },
  { id: 4, tag: 'TN-29', plate: 'SHX8B70', model: 'Chevrolet S10', status: 'disp', km: 0, fuel: 100, fuelText: '100%', maintenance: 10000, driver: '', lastLocation: 'Infratech', obs: '' },
  { id: 5, tag: 'TN-31', plate: 'TCD7I68', model: 'Toyota Hilux', status: 'disp', km: 32142, fuel: 50, fuelText: '50%', maintenance: 35000, driver: '', lastLocation: 'Infratech', obs: '' },
  { id: 6, tag: 'TN-72', plate: 'FXD9A18', model: 'Toyota Hilux', status: 'disp', km: 121342, fuel: 100, fuelText: '100%', maintenance: 125000, driver: '', lastLocation: '', obs: '' },
  { id: 7, tag: 'TN-73', plate: 'TXX4C32', model: 'Toyota Hilux', status: 'disp', km: 31581, fuel: 50, fuelText: '50%', maintenance: 35000, driver: '', lastLocation: 'Infratech', obs: '' },
  { id: 8, tag: 'TN-74', plate: 'RDM2E33', model: 'Chevrolet S10', status: 'disp', km: 32458, fuel: 100, fuelText: '100%', maintenance: 10000, driver: '', lastLocation: 'Lavador de NG', obs: '' },
  { id: 9, tag: 'TN-76', plate: 'TCD7H72', model: 'Toyota Hilux', status: 'disp', km: 30312, fuel: 100, fuelText: '100%', maintenance: 10000, driver: '', lastLocation: '', obs: '' },
  { id: 10, tag: 'TN-78', plate: 'FZY4F28', model: 'Ford Ranger', status: 'disp', km: 125429, fuel: 100, fuelText: '100%', maintenance: 130000, driver: '', lastLocation: '', obs: '' },
  { id: 11, tag: 'TN-02', plate: 'SZQ2H84', model: 'Toyota Hilux (ALCON+KOFRE)', status: 'disp', km: 38873, fuel: 50, fuelText: '50%', maintenance: 41008, driver: '', lastLocation: 'Infratech', obs: '' },
  { id: 12, tag: 'TN-99', plate: 'ABC1D23', model: 'Toyota Hilux', status: 'mobilizacao', km: 15000, fuel: 80, fuelText: '80%', maintenance: 35000, driver: '', lastLocation: 'Oficina', obs: 'Em processo de mobilização para obra', blocked: false },
  { id: 13, tag: 'TN-88', plate: 'XYZ9W87', model: 'Ford Ranger', status: 'disp', km: 45000, fuel: 60, fuelText: '60%', maintenance: 50000, driver: '', lastLocation: 'Patio', obs: '', blocked: true, blockedReason: 'Pneus precisam ser trocados', blockedBy: 'Admin', blockedAt: '27/03/2026' }
]

export const FUEL_OPTIONS = [
  { value: 'Reserva', label: 'Reserva' },
  { value: '1/4', label: '1/4' },
  { value: '2/4', label: '2/4' },
  { value: '3/4', label: '3/4' },
  { value: 'Cheio', label: 'Cheio' }
]

export const RETURN_LOCATIONS = [
  'Parauapebas',
  'Praca da Bandeira',
  'CCO',
  'Cafeteira',
  'Nucleo',
  'Helio Grace',
  'Infratech',
  'Oficina Centralizada',
  'Lavador',
  'Meio Ambiente',
  'Outros'
]

export const STATUS_COLORS: Record<string, string> = {
  disp: '#27ae60',
  uso: '#3498db',
  lav: '#f39c12',
  man: '#e74c3c',
  mobilizacao: '#9b59b6'
}

export const STATUS_BG_COLORS: Record<string, string> = {
  disp: 'rgba(39, 174, 96, 0.2)',
  uso: 'rgba(52, 152, 219, 0.2)',
  lav: 'rgba(243, 156, 18, 0.2)',
  man: 'rgba(231, 76, 60, 0.2)',
  mobilizacao: 'rgba(155, 89, 182, 0.2)'
}

export const VEHICLE_IMAGES: Record<string, string> = {
  hilux: '/vehicles/hilux.png',
  nivus: '/vehicles/nivus.png',
  s10: '/vehicles/s10.png',
  ranger: '/vehicles/ranger.png',
  generic: '/vehicles/generic.png'
}
