'use client';

import { FormEvent, useState } from 'react';
import { AlertCircle, LogOut, UserPlus } from 'lucide-react';
import { SEMANTIC_SOFT, SEMANTIC_TEXT } from '@/lib/statusColor';
import { authErrorMessage } from '@/lib/hooks/useAuth';
import DeclaredFields, { DadosDeclarados, DADOS_DECLARADOS_VAZIO } from './DeclaredFields';

interface CompleteProfileProps {
  email: string;
  onSubmit: (dados: DadosDeclarados) => Promise<void>;
  onLogout: () => void;
}

/**
 * Recuperacao de conta autenticada sem perfil.
 *
 * O cadastro toca dois servicos sem transacao entre eles: cria a conta no Auth
 * e grava o perfil no Firestore. Se a segunda etapa falhar - regras ainda nao
 * publicadas, rede caindo, aba fechada no meio - a pessoa fica autenticada e
 * sem perfil.
 *
 * Antes disso existir, a unica saida dessa tela era "Sair", e entrar de novo
 * caia no mesmo lugar: um beco sem saida que exigia um administrador apagar a
 * conta no console. As Security Rules sempre permitiram que o proprio usuario
 * criasse o seu documento; faltava a tela para isso.
 */
export default function CompleteProfile({ email, onSubmit, onLogout }: CompleteProfileProps) {
  const [dados, setDados] = useState<DadosDeclarados>(DADOS_DECLARADOS_VAZIO);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const set = (campo: keyof DadosDeclarados, valor: string | boolean) =>
    setDados((d) => ({ ...d, [campo]: valor }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await onSubmit(dados);
    } catch (err) {
      const codigo = (err as { code?: string })?.code;
      setErro(codigo ? authErrorMessage(codigo) : 'Não foi possível concluir.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        backgroundColor: 'var(--bg-main)',
      }}
    >
      <div className="surface" style={{ maxWidth: 560, width: '100%', padding: 'var(--space-8)' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: 'var(--radius-m)',
            backgroundColor: SEMANTIC_SOFT.alerta,
            color: SEMANTIC_TEXT.alerta,
            marginBottom: 'var(--space-5)',
          }}
        >
          <UserPlus size={24} />
        </span>

        <h1
          style={{
            margin: 0,
            fontSize: '1.3rem',
            fontWeight: 750,
            letterSpacing: '-0.022em',
            color: 'var(--text-primary)',
          }}
        >
          Concluir cadastro
        </h1>
        <p
          style={{
            margin: 'var(--space-2) 0 var(--space-6)',
            color: 'var(--text-secondary)',
            fontSize: '0.92rem',
            lineHeight: 1.55,
          }}
        >
          Sua conta <strong>{email}</strong> foi criada, mas o cadastro não chegou a ser gravado.
          Preencha os dados para concluir — depois disso ele segue para aprovação.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <DeclaredFields valores={dados} onChange={set} prefixo="cp" />

          {erro && (
            <p
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                margin: 0,
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: SEMANTIC_SOFT.anormal,
                color: SEMANTIC_TEXT.anormal,
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={14} />
              {erro}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Concluir cadastro'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onLogout} disabled={enviando}>
            <LogOut size={16} /> Sair
          </button>
        </form>
      </div>
    </div>
  );
}
