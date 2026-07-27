'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { OrgUnit, OrgLevel, ForumPost, ForumComment, ChecklistField, Vehicle } from '@/types';
import { initialOrgUnits, initialChecklistFields } from '@/lib/constants';
import { calcularPath, novoOrgId, migrarDaV1, reconstruirPaths } from '@/lib/org';

const ORG_KEY = 'frota_org_v2';
const ORG_KEY_V1 = 'frota_org_v1';
/** Teto de mensagens carregadas. O forum e um mural operacional, nao um
 *  arquivo historico: sem limite, um ano de uso viraria uma leitura de
 *  centenas de documentos a cada abertura da tela. */
const FORUM_LIMIT = 150;

interface OrgCache {
  units: OrgUnit[];
  checklistFields: ChecklistField[];
  lastUpdated: string;
}

function lerCache(): OrgCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ORG_KEY);
    if (raw) return JSON.parse(raw);

    // Migracao do formato v1 (duas listas soltas) para a arvore de cinco
    // niveis. Sem isto, quem ja usava o app abriria a tela de governanca
    // vazia e concluiria - com razao - que perdeu a estrutura.
    const rawV1 = localStorage.getItem(ORG_KEY_V1);
    if (rawV1) {
      const v1 = JSON.parse(rawV1);
      const units = migrarDaV1(v1.regionais || [], v1.gerencias || []);
      if (units.length > 0) {
        return {
          units,
          checklistFields: v1.checklistFields?.length ? v1.checklistFields : initialChecklistFields,
          lastUpdated: '',
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function gravarCache(cache: OrgCache) {
  try {
    localStorage.setItem(ORG_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Nao foi possivel gravar o cache da estrutura organizacional', e);
  }
}

/** Firestore recusa `undefined`. O round-trip por JSON limpa as chaves. */
function limpar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor));
}

export interface NovaUnidade {
  level: OrgLevel;
  name: string;
  code: string;
  parentId: string | null;
  attrs: Record<string, string>;
}

export interface AutorSessao {
  uid: string;
  nome: string;
  role: 'Motorista' | 'Operador' | 'Administrador';
  orgUnitId?: string;
}

export function useOrgData() {
  const [units, setUnits] = useState<OrgUnit[]>(initialOrgUnits);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [checklistFields, setChecklistFields] = useState<ChecklistField[]>(initialChecklistFields);
  const [ready, setReady] = useState(false);
  const [forumReady, setForumReady] = useState(false);

  const unitsRef = useRef(units);
  const checklistRef = useRef(checklistFields);
  const postsRef = useRef(forumPosts);
  // Mesma trava de `useFleetData`: nada e gravado antes de sabermos o que ja
  // existe. Ver o comentario extenso la — foi o que apagou a frota.
  const hidratadoRef = useRef(false);

  useEffect(() => {
    unitsRef.current = units;
  }, [units]);
  useEffect(() => {
    checklistRef.current = checklistFields;
  }, [checklistFields]);
  useEffect(() => {
    postsRef.current = forumPosts;
  }, [forumPosts]);

  // ---------------------------------------------------------------------
  // Cache local
  // ---------------------------------------------------------------------
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- o cache vem do
       localStorage, indisponivel no build estatico. Ler no useState quebraria
       a hidratacao. Mesma justificativa de useFleetData. */
    const cache = lerCache();
    if (cache?.units?.length) {
      setUnits(reconstruirPaths(cache.units));
      if (cache.checklistFields?.length) setChecklistFields(cache.checklistFields);
      hidratadoRef.current = true;
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // ---------------------------------------------------------------------
  // Estrutura organizacional — documento unico `org/data`
  // ---------------------------------------------------------------------
  // A arvore muda raramente e e lida em toda tela. Um documento so custa uma
  // leitura por sessao; uma colecao custaria uma por unidade.
  const gravarOrg = useCallback(async (proximas: OrgUnit[], checklist?: ChecklistField[]) => {
    const lastUpdated = new Date().toISOString();
    const fields = checklist ?? checklistRef.current;
    gravarCache({ units: proximas, checklistFields: fields, lastUpdated });
    if (!hidratadoRef.current) {
      console.warn('Estrutura ainda nao carregada; gravacao adiada para nao sobrescrever o real.');
      return;
    }
    try {
      await setDoc(
        doc(db, 'org', 'data'),
        limpar({ units: proximas, checklistFields: fields, lastUpdated, version: '3.0' }),
        { merge: true }
      );
    } catch (e) {
      console.error('Falha ao gravar a estrutura organizacional', e);
    }
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'org', 'data'),
      (snap) => {
        // Snapshot de cache nao e resposta do servidor. Ver useFleetData.
        const doCache = snap.metadata.fromCache;

        if (snap.exists()) {
          const data = snap.data();
          const remotas: OrgUnit[] = data.units || [];
          if (remotas.length > 0) {
            setUnits(reconstruirPaths(remotas));
            if (data.checklistFields?.length) setChecklistFields(data.checklistFields);
            gravarCache({
              units: remotas,
              checklistFields: data.checklistFields || checklistRef.current,
              lastUpdated: data.lastUpdated || '',
            });
          }
        }

        if (!doCache) {
          const vazio = !snap.exists() || (snap.data()?.units || []).length === 0;
          if (vazio && !hidratadoRef.current) {
            // Sem estrutura no servidor: publica a que temos em maos (a
            // migrada do formato antigo, se houver, ou a de exemplo).
            const base = unitsRef.current.length ? unitsRef.current : initialOrgUnits;
            const lastUpdated = new Date().toISOString();
            hidratadoRef.current = true;
            setUnits(base);
            setDoc(
              doc(db, 'org', 'data'),
              limpar({
                units: base,
                checklistFields: checklistRef.current,
                lastUpdated,
                version: '3.0',
              }),
              { merge: true }
            ).catch((e) => console.error('Falha ao semear a estrutura organizacional', e));
          }
          hidratadoRef.current = true;
        }
        setReady(true);
      },
      (e) => {
        console.error('Falha ao ouvir a estrutura organizacional', e);
        setReady(true);
      }
    );
    return () => unsub();
  }, []);

  // ---------------------------------------------------------------------
  // Forum — colecao `forumPosts`
  // ---------------------------------------------------------------------
  // Aqui e colecao, e nao documento unico, porque cada mensagem tem dono. As
  // regras precisam poder dizer "o autor edita a sua, o administrador apaga
  // qualquer uma" - e isso e impossivel de expressar sobre um array dentro de
  // um documento so: quem pode escrever no documento pode reescrever tudo.
  useEffect(() => {
    const q = query(collection(db, 'forumPosts'), orderBy('createdAt', 'desc'), limit(FORUM_LIMIT));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const posts = snap.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as ForumPost);
        setForumPosts(posts);
        setForumReady(true);
      },
      (e) => {
        console.error('Falha ao ouvir o forum', e);
        setForumReady(true);
      }
    );
    return () => unsub();
  }, []);

  // ---------------------------------------------------------------------
  // Operacoes sobre a arvore
  // ---------------------------------------------------------------------
  const criarUnidade = useCallback(
    (dados: NovaUnidade): OrgUnit => {
      const atual = unitsRef.current;
      const unidade: OrgUnit = {
        id: novoOrgId(dados.level),
        level: dados.level,
        name: dados.name.trim(),
        code: dados.code.trim().toUpperCase(),
        parentId: dados.parentId,
        path: calcularPath(atual, dados.parentId),
        createdAt: new Date().toISOString().split('T')[0],
        attrs: dados.attrs,
        active: true,
      };
      const proximas = [...atual, unidade];
      unitsRef.current = proximas;
      setUnits(proximas);
      void gravarOrg(proximas);
      return unidade;
    },
    [gravarOrg]
  );

  const atualizarUnidade = useCallback(
    (id: string, patch: Partial<Omit<OrgUnit, 'id' | 'level'>>) => {
      const proximas = reconstruirPaths(
        unitsRef.current.map((u) => (u.id === id ? { ...u, ...patch } : u))
      );
      unitsRef.current = proximas;
      setUnits(proximas);
      void gravarOrg(proximas);
    },
    [gravarOrg]
  );

  const excluirUnidade = useCallback(
    (id: string) => {
      const proximas = unitsRef.current.filter((u) => u.id !== id);
      unitsRef.current = proximas;
      setUnits(proximas);
      void gravarOrg(proximas);
    },
    [gravarOrg]
  );

  const saveChecklistFields = useCallback(
    (fields: ChecklistField[]) => {
      setChecklistFields(fields);
      checklistRef.current = fields;
      void gravarOrg(unitsRef.current, fields);
    },
    [gravarOrg]
  );

  /** Compatibilidade: criar uma regional continua semeando um veiculo. */
  const createRegional = useCallback(
    (
      data: { name: string; code: string; description: string },
      onVehicleSeed: (vehicle: Vehicle) => void
    ) => {
      const regional = criarUnidade({
        level: 'regional',
        name: data.name,
        code: data.code,
        parentId: null,
        attrs: { descricao: data.description },
      });
      const seedVehicle: Vehicle = {
        id: Date.now(),
        tag: `TN-${String(Math.floor(Math.random() * 90) + 10)}`,
        plate: `STD${Math.floor(Math.random() * 9000) + 1000}`,
        model: 'Toyota Hilux',
        status: 'disp',
        km: 0,
        fuel: 100,
        fuelText: 'Cheio',
        maintenance: 10000,
        driver: '',
        lastLocation: 'Patio Central',
        obs: 'Veículo standard criado automaticamente com a nova regional',
        regionalId: regional.id,
        lastStatusChangeAt: new Date().toISOString(),
        lastWashedAt: new Date().toISOString(),
      };
      onVehicleSeed(seedVehicle);
    },
    [criarUnidade]
  );

  // ---------------------------------------------------------------------
  // Forum
  // ---------------------------------------------------------------------
  // O autor NUNCA vem do formulario. Antes era um campo de texto livre, o que
  // permitia assinar como qualquer pessoa - inaceitavel num sistema com
  // auditoria. Agora vem da sessao, e a regra do Firestore confere o uid.
  const addForumPost = useCallback(
    async (
      post: { title: string; content: string; category: ForumPost['category'] },
      autor: AutorSessao
    ) => {
      const escopo = unitsRef.current.find((u) => u.id === autor.orgUnitId);
      const novo = limpar({
        title: post.title.trim(),
        content: post.content.trim(),
        category: post.category,
        authorUid: autor.uid,
        author: autor.nome,
        role: autor.role,
        orgUnitId: autor.orgUnitId || null,
        orgPath: escopo ? [...escopo.path, escopo.id] : [],
        regionalId: escopo?.path[0] || null,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: [],
      });
      await addDoc(collection(db, 'forumPosts'), novo);
    },
    []
  );

  const editForumPost = useCallback(async (postId: string, title: string, content: string) => {
    await updateDoc(doc(db, 'forumPosts', postId), {
      title: title.trim(),
      content: content.trim(),
      editedAt: new Date().toISOString(),
    });
  }, []);

  const deleteForumPost = useCallback(async (postId: string) => {
    await deleteDoc(doc(db, 'forumPosts', postId));
  }, []);

  const addForumComment = useCallback(
    async (postId: string, content: string, autor: AutorSessao) => {
      const post = postsRef.current.find((p) => p.id === postId);
      const comment: ForumComment = {
        id: `c-${Date.now()}`,
        authorUid: autor.uid,
        author: autor.nome,
        role: autor.role,
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'forumPosts', postId), {
        comments: limpar([...(post?.comments || []), comment]),
      });
    },
    []
  );

  const likeForumPost = useCallback(async (postId: string) => {
    const post = postsRef.current.find((p) => p.id === postId);
    await updateDoc(doc(db, 'forumPosts', postId), { likes: (post?.likes || 0) + 1 });
  }, []);

  // ---------------------------------------------------------------------
  // Compatibilidade com as telas que ainda pensam em duas listas
  // ---------------------------------------------------------------------
  const regionais = useMemo(
    () =>
      units
        .filter((u) => u.level === 'regional')
        .map((u) => ({
          id: u.id,
          name: u.name,
          code: u.code,
          createdAt: u.createdAt,
          description: u.attrs.descricao,
        })),
    [units]
  );

  const gerencias = useMemo(
    () =>
      units
        .filter((u) => u.level === 'gerencia')
        .map((u) => ({
          id: u.id,
          regionalId: u.parentId || '',
          name: u.name,
          code: u.code,
          responsible: u.attrs.gerente || 'A definir',
          createdAt: u.createdAt,
        })),
    [units]
  );

  return {
    ready,
    forumReady,
    units,
    regionais,
    gerencias,
    forumPosts,
    checklistFields,
    saveChecklistFields,
    criarUnidade,
    atualizarUnidade,
    excluirUnidade,
    createRegional,
    addForumPost,
    editForumPost,
    deleteForumPost,
    addForumComment,
    likeForumPost,
  };
}
