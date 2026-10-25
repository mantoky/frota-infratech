import { Vehicle } from '@/types';

/**
 * A busca olha só a tag. Placa, modelo, motorista, KM e manutenção ficam de fora.
 * O número vale no começo do bloco da tag:
 * 4 acha 4, 04, 44, 41 e 43. 3 acha 3, 03, 33, 31 e 300.
 */

function compactar(valor: string): string {
  return valor.toLowerCase().replace(/-/g, '');
}

/** 04 e 4 são o mesmo número. 00 continua sendo zero. */
function significativo(digitos: string): string {
  return digitos.replace(/^0+/, '') || '0';
}

function letras(valor: string): string {
  return (valor.match(/[a-z]+/g) ?? []).join('');
}

function numeros(valor: string): string {
  return (valor.match(/\d+/g) ?? []).join('');
}

export function textoCombina(consulta: string, tag: string): boolean {
  const q = compactar(consulta.trim());
  const f = compactar(tag);
  if (!q) return true;

  const qLetras = letras(q);
  const fLetras = letras(f);
  if (qLetras && !fLetras.includes(qLetras)) return false;

  const qNumeros = numeros(q);
  if (!qNumeros) return true;

  const fNumeros = numeros(f);
  if (!fNumeros) return false;
  return significativo(fNumeros).startsWith(significativo(qNumeros));
}

export function vehicleMatchesSearch(vehicle: Pick<Vehicle, 'tag'>, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  return textoCombina(q, vehicle.tag);
}
