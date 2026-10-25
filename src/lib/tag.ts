/** Tira só o hífen. TN-01 vira TN01, TN-31 vira TN31, e cada número permanece. */
export function tagCanonica(tag: string): string {
  return tag.replace(/-/g, '');
}

/** "TN-31 (TCD7I68)" vira "TN31 (TCD7I68)". O que está entre parênteses fica. */
export function veiculoDoHistorico(texto: string): string {
  const abre = texto.indexOf(' (');
  if (abre === -1) return tagCanonica(texto);
  return `${tagCanonica(texto.slice(0, abre))}${texto.slice(abre)}`;
}
