'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ForumPost } from '@/types';

// ---------------------------------------------------------------------------
// Mensagens nao lidas
// ---------------------------------------------------------------------------
// O marcador e um carimbo de tempo por usuario, guardado no dispositivo. Nao e
// no Firestore de proposito: "ja vi esta mensagem" e uma nocao por aparelho -
// abrir no celular nao deveria zerar o aviso no desktop, que e onde a pessoa
// talvez ainda precise reagir. E, como marcador de leitura, se perder no
// maximo mostra uma bolinha a mais.
//
// A chave inclui o uid porque um mesmo dispositivo pode ser usado por
// condutores diferentes na troca de turno - sem isso, um herdaria o "ja li"
// do outro.

const chave = (uid: string) => `frota_forum_lido_${uid}`;

export function useUnreadForum(posts: ForumPost[], uid: string | undefined) {
  const [lastSeen, setLastSeen] = useState<string>('');

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage nao
       existe no build estatico; ler no useState quebraria a hidratacao */
    if (!uid) return;
    try {
      setLastSeen(localStorage.getItem(chave(uid)) || '');
    } catch {
      setLastSeen('');
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [uid]);

  // A propria mensagem do autor nunca conta como nao lida: ninguem precisa ser
  // avisado do que acabou de escrever.
  const unread = useMemo(() => {
    if (!uid) return 0;
    return posts.filter((p) => p.authorUid !== uid && (!lastSeen || p.createdAt > lastSeen)).length;
  }, [posts, lastSeen, uid]);

  const marcarComoLido = useCallback(() => {
    if (!uid) return;
    const agora = new Date().toISOString();
    setLastSeen(agora);
    try {
      localStorage.setItem(chave(uid), agora);
    } catch {
      /* modo privado sem storage: o contador volta na proxima visita, e so */
    }
  }, [uid]);

  return { unread, marcarComoLido, lastSeen };
}
