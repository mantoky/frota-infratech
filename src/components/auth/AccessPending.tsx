'use client';

import { Clock, Ban, UserX, LogOut, AlertCircle } from 'lucide-react';
import { UserStatus } from '@/types';
import { SEMANTIC_SOFT, SEMANTIC_TEXT, SemanticStatus } from '@/lib/statusColor';

interface AccessPendingProps {
  status: UserStatus | 'sem-perfil' | null;
  nome: string;
  onLogout: () => void;
}

/**
 * Tela de quem esta autenticado mas ainda nao tem acesso liberado.
 *
 * Cada estado ganha mensagem propria de proposito. Um "acesso negado" generico
 * faz quem so precisa esperar procurar suporte, e faz quem foi bloqueado
 * continuar tentando entrar. Sao situacoes diferentes e a acao esperada
 * tambem e.
 */
export default function AccessPending({ status, nome, onLogout }: AccessPendingProps) {
  const conteudo: Record<
    string,
    { icone: React.ReactNode; tom: SemanticStatus; titulo: string; texto: string }
  > = {
    pendente: {
      icone: <Clock size={26} />,
      tom: 'alerta',
      titulo: 'Cadastro em análise',
      texto:
        'Seu cadastro foi recebido e aguarda aprovação de um administrador ou operador da sua área. A conferência inclui RAC02, cadastro no Prontos e ID do crachá.',
    },
    bloqueado: {
      icone: <Ban size={26} />,
      tom: 'anormal',
      titulo: 'Acesso bloqueado',
      texto:
        'Esta conta foi bloqueada por um administrador. Procure o responsável pela sua área para entender o motivo.',
    },
    inativo: {
      icone: <UserX size={26} />,
      tom: 'anormal',
      titulo: 'Conta desativada',
      texto: 'Esta conta foi desativada e não tem mais acesso à plataforma.',
    },
    'sem-perfil': {
      icone: <AlertCircle size={26} />,
      tom: 'anormal',
      titulo: 'Perfil não encontrado',
      texto:
        'A conta existe na autenticação, mas não há perfil correspondente. Procure um administrador para concluir o cadastro.',
    },
  };

  const info = conteudo[status ?? 'sem-perfil'] ?? conteudo['sem-perfil'];

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
      <div
        className="surface"
        style={{ maxWidth: 440, padding: 'var(--space-8)', textAlign: 'center' }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 'var(--radius-m)',
            backgroundColor: SEMANTIC_SOFT[info.tom],
            color: SEMANTIC_TEXT[info.tom],
            marginBottom: 'var(--space-5)',
          }}
        >
          {info.icone}
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
          {info.titulo}
        </h1>

        {nome && (
          <p
            style={{
              margin: 'var(--space-2) 0 0',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            {nome}
          </p>
        )}

        <p
          style={{
            margin: 'var(--space-4) 0 var(--space-6)',
            color: 'var(--text-secondary)',
            fontSize: '0.92rem',
            lineHeight: 1.55,
          }}
        >
          {info.texto}
        </p>

        <button
          type="button"
          className="btn btn-outline"
          style={{ width: '100%' }}
          onClick={onLogout}
        >
          <LogOut size={16} /> Sair
        </button>
      </div>
    </div>
  );
}
