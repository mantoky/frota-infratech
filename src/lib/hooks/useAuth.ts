'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getAppAuth, db } from '@/lib/firebase';
import { UserLevel, UserProfile, UserStatus } from '@/types';

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  /** true enquanto o Firebase ainda nao respondeu se ha sessao. */
  loading: boolean;
  /** Autenticado E aprovado. Estar logado nao basta. */
  isActive: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  status: UserStatus | 'sem-perfil' | null;
}

/** Traduz os codigos do Firebase Auth para algo que o usuario entenda.
 *  As mensagens padrao sao em ingles e vazam nome de API na tela. */
export function authErrorMessage(code: string): string {
  const mapa: Record<string, string> = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-disabled': 'Esta conta foi desativada.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Já existe uma conta com este e-mail.',
    'auth/weak-password': 'A senha precisa ter ao menos 12 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
    'auth/network-request-failed': 'Sem conexão. Verifique a rede e tente de novo.',
    'auth/operation-not-allowed': 'Login por e-mail e senha não está habilitado no projeto.',

    // O cadastro toca DOIS servicos: cria a conta no Auth e grava o perfil no
    // Firestore. Quando a segunda etapa falha, o codigo nao comeca com `auth/`
    // e caia no texto generico - que nao dizia nada e mandava "tentar de novo"
    // numa situacao que nunca se resolve tentando de novo.
    'permission-denied':
      'As regras de segurança do banco recusaram o cadastro. As Security Rules provavelmente ainda não foram publicadas.',
    unavailable: 'Sem conexão com o banco de dados. Verifique a rede e tente de novo.',
    'failed-precondition': 'O banco de dados não está pronto para receber o cadastro.',
  };
  return mapa[code] || 'Não foi possível concluir. Tente novamente.';
}

export function useAuth(): AuthState & {
  signIn: (email: string, senha: string) => Promise<void>;
  signUp: (dados: SignUpData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  reauthenticate: (senha: string) => Promise<void>;
} {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAppAuth(), async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        setProfile(snap.exists() ? ({ uid: u.uid, ...snap.data() } as UserProfile) : null);
      } catch (e) {
        // Perfil ilegivel nao pode virar acesso liberado: sem perfil, o app
        // trata como conta nao aprovada.
        console.error('Falha ao carregar perfil do usuario', e);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = useCallback(async (email: string, senha: string) => {
    await signInWithEmailAndPassword(getAppAuth(), email.trim().toLowerCase(), senha);
  }, []);

  const signUp = useCallback(async (dados: SignUpData) => {
    // Minusculas obrigatorias. O Firebase normaliza o e-mail no token, entao
    // `auth.token.email` sempre vem em minusculo. A rule compara o campo
    // gravado com esse token; se a pessoa digitasse "Nome@Empresa.com", os
    // dois nao batiam e o cadastro era recusado com permission-denied.
    const email = dados.email.trim().toLowerCase();

    const cred = await createUserWithEmailAndPassword(getAppAuth(), email, dados.senha);

    try {
      await updateProfile(cred.user, { displayName: dados.nomeCompleto });

      // O documento nasce `pendente` e com nivel comum. As Security Rules
      // recusam qualquer outra combinacao vinda do cliente - se aceitassem,
      // bastaria uma escrita direta pelo SDK para nascer administrador.
      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        displayName: dados.nomeCompleto,
        level: 'usuario' satisfies UserLevel,
        status: 'pendente' satisfies UserStatus,
        declarado: {
          gerencia: dados.gerencia,
          coordenador: dados.coordenador,
          gestorStaff: dados.gestorStaff,
          funcao: dados.funcao,
          empresa: dados.empresa,
          idCracha: dados.idCracha,
          rac02: dados.rac02,
          prontosCadastrado: dados.prontosCadastrado,
        },
        preferencias: { popupNovasMensagens: true, idioma: 'pt', tema: 'light' },
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      // O cadastro nao e atomico: a conta no Auth ja existe quando a gravacao
      // do perfil falha. Sem desfazer, a pessoa fica presa - a proxima
      // tentativa devolve "e-mail ja em uso" e a conta orfa nunca recebe
      // perfil. Apagar aqui e possivel porque a credencial acabou de ser
      // criada e ainda e recente o bastante para o Firebase aceitar.
      await deleteUser(cred.user).catch((cleanupError) => {
        console.error(
          'Cadastro falhou e a conta órfã não pôde ser removida. ' +
            'Será necessário excluí-la no console do Firebase.',
          cleanupError
        );
      });
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(getAppAuth());
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(getAppAuth(), email.trim().toLowerCase());
  }, []);

  // Step-up real, no lugar do PIN: antes de uma acao destrutiva, o Firebase
  // reconfirma a senha. Diferente do PIN anterior, isto e verificado pelo
  // servidor de autenticacao, nao por uma constante embutida no bundle.
  const reauthenticate = useCallback(async (senha: string) => {
    const atual = getAppAuth().currentUser;
    if (!atual?.email) throw new Error('Sem sessão ativa');
    const cred = EmailAuthProvider.credential(atual.email, senha);
    await reauthenticateWithCredential(atual, cred);
  }, []);

  const status: AuthState['status'] = !user ? null : profile ? profile.status : 'sem-perfil';
  const isActive = profile?.status === 'ativo';

  return {
    user,
    profile,
    loading,
    isActive,
    isAdmin: isActive && ['admin', 'admin_master'].includes(profile?.level ?? ''),
    isOperator: isActive && ['operador', 'admin', 'admin_master'].includes(profile?.level ?? ''),
    status,
    signIn,
    signUp,
    logout,
    resetPassword,
    reauthenticate,
  };
}

export interface SignUpData {
  nomeCompleto: string;
  email: string;
  senha: string;
  gerencia: string;
  coordenador: string;
  gestorStaff: string;
  funcao: string;
  empresa: string;
  idCracha: string;
  rac02: string;
  prontosCadastrado: boolean;
}
