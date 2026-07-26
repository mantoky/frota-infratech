'use client';

import { FormEvent, useState } from 'react';
import Modal from './Modal';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { SEMANTIC_SOFT, SEMANTIC_TEXT } from '@/lib/statusColor';

interface ConfirmPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  acao: string | null;
  erro: string;
  onConfirm: (senha: string) => void;
}

const DESCRICAO: Record<string, string> = {
  delete: 'Excluir este veículo remove o cadastro da frota. O histórico permanece registrado.',
  unblock: 'Desbloquear libera o veículo para retirada imediatamente.',
  add: 'Cadastrar um novo veículo na frota.',
};

/**
 * Step-up de autenticacao antes de acao destrutiva.
 *
 * Substitui o antigo PinModal. A diferenca nao e cosmetica: o PIN era comparado
 * com uma constante embutida no bundle (`NEXT_PUBLIC_ADMIN_PIN_*`), legivel por
 * qualquer pessoa que abrisse o JavaScript. Aqui a senha e verificada pelo
 * servidor de autenticacao do Firebase, e uma senha errada nao passa nem que o
 * cliente seja adulterado.
 */
export default function ConfirmPasswordModal({
  isOpen,
  onClose,
  acao,
  erro,
  onConfirm,
}: ConfirmPasswordModalProps) {
  const [senha, setSenha] = useState('');

  // Limpar no proprio caminho de saida, e nao num efeito que observa `isOpen`:
  // manter credencial em memoria depois do uso e desnecessario, e um efeito
  // que chama setState no corpo dispara render em cascata.
  const fechar = () => {
    setSenha('');
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!senha) return;
    onConfirm(senha);
    setSenha('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={fechar}
      title="Confirmar identidade"
      description="Esta ação exige que você digite sua senha novamente."
      maxWidth="440px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--space-4)' }}>
        {acao && DESCRICAO[acao] && (
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-s)',
              backgroundColor: SEMANTIC_SOFT.alerta,
              color: 'var(--text-primary)',
              fontSize: '0.86rem',
            }}
          >
            <ShieldAlert size={18} style={{ color: SEMANTIC_TEXT.alerta, flexShrink: 0 }} />
            <span>{DESCRICAO[acao]}</span>
          </div>
        )}

        <div>
          <label htmlFor="confirm-senha" className="field-label">
            Sua senha
          </label>
          <input
            id="confirm-senha"
            className="field"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            autoFocus
            aria-invalid={!!erro}
            aria-describedby={erro ? 'confirm-erro' : undefined}
          />
        </div>

        {erro && (
          <p
            id="confirm-erro"
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              margin: 0,
              padding: 'var(--space-2)',
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button type="button" className="btn btn-outline" onClick={fechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={!senha}>
            Confirmar
          </button>
        </div>
      </form>
    </Modal>
  );
}
