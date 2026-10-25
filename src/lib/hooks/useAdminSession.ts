'use client';

import { useCallback, useEffect, useState } from 'react';

const CHAVE = 'frota-admin';

/** A senha fica na variável de ambiente e é conferida no navegador.
 *  Sem valor configurado, ninguém entra: falhar fechado. */
export function senhaAdministradorConfere(senha: string): boolean {
  const esperada = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '';
  if (!esperada || !senha) return false;
  return senha === esperada;
}

export function useAdminSession() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sessionStorage nao
       existe no build estatico; ler no useState quebraria a hidratacao */
    try {
      setIsAdmin(sessionStorage.getItem(CHAVE) === '1');
    } catch {
      setIsAdmin(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const entrar = useCallback((senha: string) => {
    if (!senhaAdministradorConfere(senha)) return false;
    sessionStorage.setItem(CHAVE, '1');
    setIsAdmin(true);
    return true;
  }, []);

  const sair = useCallback(() => {
    sessionStorage.removeItem(CHAVE);
    setIsAdmin(false);
  }, []);

  return { isAdmin, entrar, sair };
}
