import { VEHICLE_IMAGES } from '@/lib/constants';

// Mapa modelo -> arte. A mesma funcao estava copiada em VehicleCard e
// VehicleMiniCard; centralizar evita que cadastrar um modelo novo funcione
// num card e caia no generico no outro.
const MODEL_MATCHERS: [string, string][] = [
  ['hilux', VEHICLE_IMAGES.hilux],
  ['nivus', VEHICLE_IMAGES.nivus],
  ['s10', VEHICLE_IMAGES.s10],
  ['ranger', VEHICLE_IMAGES.ranger],
];

export function getVehicleImage(model: string): string {
  const normalized = (model || '').toLowerCase();
  const match = MODEL_MATCHERS.find(([needle]) => normalized.includes(needle));
  return match ? match[1] : VEHICLE_IMAGES.generic;
}
