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
    await signInWithEmailAndPassword(getAppAuth(), email.trim(), senha);
  }, []);

  const signUp = useCallback(async (dados: SignUpData) => {
    const cred = await createUserWithEmailAndPassword(
      getAppAuth(),
      dados.email.trim(),
      dados.senha
    );
    await updateProfile(cred.user, { displayName: dados.nomeCompleto });

    // O documento nasce `pendente` e com nivel comum. As Security Rules
    // recusam qualquer outra combinacao vinda do cliente - se aceitassem,
    // bastaria uma escrita direta pelo SDK para nascer administrador.
    await setDoc(doc(db, 'users', cred.user.uid), {
      email: dados.email.trim(),
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
  }, []);

  const logout = useCallback(async () => {
    await signOut(getAppAuth());
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(getAppAuth(), email.trim());
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
