import { Vehicle } from '@/types';

/** Código no formato letras + número, depois de tirar o hífen e a caixa. */
const CODIGO = /^([a-z]+)(\d+)$/;

/**
 * A tag guardada é a original sem o hífen: TN-01 vira TN01, TN-31 vira TN31.
 * A busca ainda acha o veículo se alguém digitar o hífen ou esquecer o zero.
 */
function compactar(valor: string): string {
  return valor.toLowerCase().replace(/-/g, '');
}

function codigosEquivalentes(consulta: string, campo: string): boolean {
  const q = consulta.match(CODIGO);
  const f = campo.match(CODIGO);
  if (!q || !f) return false;
  return q[1] === f[1] && Number(q[2]) === Number(f[2]);
}

/** 04 e 4 são o mesmo número. 00 continua sendo zero. */
function significativo(digitos: string): string {
  return digitos.replace(/^0+/, '') || '0';
}

/**
 * Um número curto só conta no começo do bloco.
 * 4 acha 4, 04, 44, 41 e 49. Não acha 84, 64 nem 34.
 */
function numeroNoComeco(consulta: string, bloco: string): boolean {
  return significativo(bloco).startsWith(significativo(consulta));
}

export function textoCombina(consulta: string, texto: string): boolean {
  const q = compactar(consulta.trim());
  const f = compactar(texto);
  if (!q) return true;
  if (CODIGO.test(q) && CODIGO.test(f)) return codigosEquivalentes(q, f);
  if (/^\d+$/.test(q)) {
    const blocos = f.match(/\d+/g) ?? [];
    return blocos.some((bloco) => numeroNoComeco(q, bloco));
  }
  return f.includes(q);
}

export function vehicleMatchesSearch(
  vehicle: Pick<Vehicle, 'tag' | 'plate' | 'model' | 'driver'>,
  query: string
): boolean {
  const q = query.trim();
  if (!q) return true;
  return (
    textoCombina(q, vehicle.tag) ||
    textoCombina(q, vehicle.plate) ||
    textoCombina(q, vehicle.model) ||
    textoCombina(q, vehicle.driver || '')
  );
}
