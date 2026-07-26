'use client';

/**
 * Campos declarados no cadastro, compartilhados por duas telas.
 *
 * O autocadastro (LoginScreen) e a recuperacao de perfil (CompleteProfile)
 * pedem exatamente os mesmos dados. Duplicar os oito campos em dois arquivos
 * garantiria que um dia eles divergissem - e divergencia aqui significa perfil
 * gravado incompleto dependendo de por onde a pessoa passou.
 */

export interface DadosDeclarados {
  nomeCompleto: string;
  gerencia: string;
  coordenador: string;
  gestorStaff: string;
  funcao: string;
  empresa: string;
  idCracha: string;
  rac02: string;
  prontosCadastrado: boolean;
}

export const DADOS_DECLARADOS_VAZIO: DadosDeclarados = {
  nomeCompleto: '',
  gerencia: '',
  coordenador: '',
  gestorStaff: '',
  funcao: '',
  empresa: '',
  idCracha: '',
  rac02: '',
  prontosCadastrado: false,
};

interface DeclaredFieldsProps {
  valores: DadosDeclarados;
  onChange: (campo: keyof DadosDeclarados, valor: string | boolean) => void;
  /** Prefixo dos ids, para as duas telas nao colidirem se convivessem. */
  prefixo: string;
}

export default function DeclaredFields({ valores, onChange, prefixo }: DeclaredFieldsProps) {
  const campo = (
    chave: keyof DadosDeclarados,
    rotulo: string,
    extras: React.InputHTMLAttributes<HTMLInputElement> = {}
  ) => {
    const id = `${prefixo}-${chave}`;
    return (
      <div>
        <label htmlFor={id} className="field-label">
          {rotulo}
        </label>
        <input
          id={id}
          className="field"
          value={valores[chave] as string}
          onChange={(e) => onChange(chave, e.target.value)}
          required
          {...extras}
        />
      </div>
    );
  };

  return (
    <>
      {campo('nomeCompleto', 'Nome completo', { autoComplete: 'name' })}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {campo('empresa', 'Empresa')}
        {campo('funcao', 'Função')}
        {campo('gerencia', 'Gerência')}
        {campo('coordenador', 'Coordenador')}
        {campo('gestorStaff', 'Gestor / staff')}
        {campo('idCracha', 'ID crachá')}
        {campo('rac02', 'RAC02')}
      </div>

      <label
        className="surface-inset"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-3)',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={valores.prontosCadastrado}
          onChange={(e) => onChange('prontosCadastrado', e.target.checked)}
        />
        <span style={{ fontSize: '0.88rem' }}>Declaro possuir cadastro no Prontos</span>
      </label>

      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        RAC02, Prontos e crachá são conferidos por um administrador ou operador da sua área antes da
        liberação do acesso.
      </p>
    </>
  );
}
