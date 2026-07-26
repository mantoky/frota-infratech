'use client';

import { useState, FormEvent, CSSProperties } from 'react';
import { t } from '@/lib/hooks/useTranslations';
import { Download, Truck, AlertCircle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { SEMANTIC_TEXT, SEMANTIC_SOFT } from '@/lib/statusColor';
import { SignUpData, authErrorMessage } from '@/lib/hooks/useAuth';

type Modo = 'login' | 'cadastro' | 'recuperar';

interface LoginScreenProps {
  currentLang: string;
  canInstall: boolean;
  onInstall: () => void;
  onSignIn: (email: string, senha: string) => Promise<void>;
  onSignUp: (dados: SignUpData) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
}

const SENHA_MINIMA = 12;

export default function LoginScreen({
  currentLang,
  canInstall,
  onInstall,
  onSignIn,
  onSignUp,
  onResetPassword,
}: LoginScreenProps) {
  const [modo, setModo] = useState<Modo>('login');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const [form, setForm] = useState({
    nomeCompleto: '',
    gerencia: '',
    coordenador: '',
    gestorStaff: '',
    funcao: '',
    empresa: '',
    idCracha: '',
    rac02: '',
    prontosCadastrado: false,
  });
  const set = (campo: keyof typeof form, valor: string | boolean) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const styles: { [key: string]: CSSProperties } = {
    page: {
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)',
      backgroundColor: 'var(--bg-main)',
      backgroundImage:
        'radial-gradient(60rem 40rem at 15% -10%, var(--brand-secondary-soft), transparent 60%),' +
        'radial-gradient(50rem 35rem at 110% 110%, var(--brand-primary-soft), transparent 55%)',
    },
    card: {
      width: '100%',
      maxWidth: modo === 'cadastro' ? '560px' : '400px',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-l)',
      padding: 'var(--space-8)',
      boxShadow: 'var(--shadow-lg)',
      transition: 'max-width var(--duration-base) var(--ease-out)',
    },
    logo: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 54,
      height: 54,
      borderRadius: 'var(--radius-m)',
      background: 'linear-gradient(140deg, #00594c, #001f36)',
      color: '#fff',
      marginBottom: 'var(--space-5)',
    },
  };

  const mensagem = (texto: string, tipo: 'erro' | 'ok') => (
    <p
      role={tipo === 'erro' ? 'alert' : 'status'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        margin: 'var(--space-3) 0 0',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-xs)',
        backgroundColor: tipo === 'erro' ? SEMANTIC_SOFT.anormal : SEMANTIC_SOFT.ok,
        color: tipo === 'erro' ? SEMANTIC_TEXT.anormal : SEMANTIC_TEXT.ok,
        fontSize: '0.82rem',
        fontWeight: 600,
      }}
    >
      {tipo === 'erro' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
      {texto}
    </p>
  );

  const executar = async (acao: () => Promise<void>, sucesso?: string) => {
    setErro('');
    setAviso('');
    setEnviando(true);
    try {
      await acao();
      if (sucesso) setAviso(sucesso);
    } catch (e) {
      // O Firebase devolve mensagem em ingles com nome de API dentro
      // ("Firebase: Error (auth/invalid-credential)"). Traduzir pelo codigo
      // evita jogar isso na cara de quem so quer entrar no app.
      const codigo = (e as { code?: string })?.code;
      setErro(codigo ? authErrorMessage(codigo) : 'Não foi possível concluir.');
    } finally {
      setEnviando(false);
    }
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    executar(() => onSignIn(email, senha));
  };

  const handleCadastro = (e: FormEvent) => {
    e.preventDefault();
    if (senha.length < SENHA_MINIMA) {
      setErro(`A senha precisa ter ao menos ${SENHA_MINIMA} caracteres.`);
      return;
    }
    executar(
      () => onSignUp({ ...form, email, senha }),
      'Cadastro enviado. Um administrador da sua área precisa aprovar antes do primeiro acesso.'
    );
  };

  const handleRecuperar = (e: FormEvent) => {
    e.preventDefault();
    executar(
      () => onResetPassword(email),
      'Se houver conta com este e-mail, o link de redefinição foi enviado.'
    );
  };

  const campo = (
    id: string,
    rotulo: string,
    valor: string,
    onChange: (v: string) => void,
    extras: React.InputHTMLAttributes<HTMLInputElement> = {}
  ) => (
    <div>
      <label htmlFor={id} className="field-label">
        {rotulo}
      </label>
      <input
        id={id}
        className="field"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        {...extras}
      />
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <span style={styles.logo}>
          <Truck size={26} />
        </span>

        <p className="eyebrow" style={{ marginBottom: 'var(--space-1)' }}>
          Infratech
        </p>
        <h1
          style={{
            fontSize: '1.55rem',
            fontWeight: 750,
            letterSpacing: '-0.026em',
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Gestão de Frota
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.92rem',
            lineHeight: 1.5,
            margin: 'var(--space-2) 0 var(--space-6)',
          }}
        >
          {modo === 'login' && t('loginSubtitle', currentLang)}
          {modo === 'cadastro' && 'Primeiro acesso. O cadastro passa por aprovação da sua área.'}
          {modo === 'recuperar' &&
            'Informe o e-mail corporativo para receber o link de redefinição.'}
        </p>

        {modo === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {campo('login-email', 'E-mail corporativo', email, setEmail, {
              type: 'email',
              autoComplete: 'username',
              required: true,
              placeholder: 'nome@empresa.com.br',
            })}
            {campo('login-senha', 'Senha', senha, setSenha, {
              type: 'password',
              autoComplete: 'current-password',
              required: true,
            })}
            <button type="submit" className="btn btn-secondary" disabled={enviando}>
              {enviando ? <Loader2 size={17} className="animate-spin" /> : null}
              {t('btnEnter', currentLang)}
              {!enviando && <ArrowRight size={17} />}
            </button>
          </form>
        )}

        {modo === 'recuperar' && (
          <form onSubmit={handleRecuperar} style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {campo('rec-email', 'E-mail corporativo', email, setEmail, {
              type: 'email',
              autoComplete: 'username',
              required: true,
            })}
            <button type="submit" className="btn btn-secondary" disabled={enviando}>
              Enviar link de redefinição
            </button>
          </form>
        )}

        {modo === 'cadastro' && (
          <form onSubmit={handleCadastro} style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {campo('cad-nome', 'Nome completo', form.nomeCompleto, (v) => set('nomeCompleto', v), {
              required: true,
              autoComplete: 'name',
            })}
            {campo('cad-email', 'E-mail corporativo', email, setEmail, {
              type: 'email',
              required: true,
              autoComplete: 'username',
            })}
            {campo('cad-senha', `Senha (mínimo ${SENHA_MINIMA} caracteres)`, senha, setSenha, {
              type: 'password',
              required: true,
              minLength: SENHA_MINIMA,
              autoComplete: 'new-password',
            })}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--space-4)',
              }}
            >
              {campo('cad-empresa', 'Empresa', form.empresa, (v) => set('empresa', v), {
                required: true,
              })}
              {campo('cad-funcao', 'Função', form.funcao, (v) => set('funcao', v), {
                required: true,
              })}
              {campo('cad-gerencia', 'Gerência', form.gerencia, (v) => set('gerencia', v), {
                required: true,
              })}
              {campo(
                'cad-coordenador',
                'Coordenador',
                form.coordenador,
                (v) => set('coordenador', v),
                { required: true }
              )}
              {campo(
                'cad-gestor',
                'Gestor / staff',
                form.gestorStaff,
                (v) => set('gestorStaff', v),
                { required: true }
              )}
              {campo('cad-cracha', 'ID crachá', form.idCracha, (v) => set('idCracha', v), {
                required: true,
              })}
              {campo('cad-rac02', 'RAC02', form.rac02, (v) => set('rac02', v), { required: true })}
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
                checked={form.prontosCadastrado}
                onChange={(e) => set('prontosCadastrado', e.target.checked)}
              />
              <span style={{ fontSize: '0.88rem' }}>Declaro possuir cadastro no Prontos</span>
            </label>

            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              RAC02, Prontos e crachá são conferidos por um administrador ou operador da sua área
              antes da liberação do acesso.
            </p>

            <button type="submit" className="btn btn-primary" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar cadastro'}
            </button>
          </form>
        )}

        {erro && mensagem(erro, 'erro')}
        {aviso && mensagem(aviso, 'ok')}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            margin: 'var(--space-5) 0 var(--space-2)',
          }}
        >
          <span style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
          <span className="eyebrow">ou</span>
          <span style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
        </div>

        <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
          {modo !== 'login' && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setModo('login');
                setErro('');
                setAviso('');
              }}
            >
              Já tenho conta — entrar
            </button>
          )}
          {modo !== 'cadastro' && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setModo('cadastro');
                setErro('');
                setAviso('');
              }}
            >
              Primeiro acesso — criar cadastro
            </button>
          )}
          {modo !== 'recuperar' && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setModo('recuperar');
                setErro('');
                setAviso('');
              }}
            >
              Esqueci minha senha
            </button>
          )}
        </div>

        {canInstall && (
          <button
            type="button"
            className="btn btn-outline"
            style={{ width: '100%', marginTop: 'var(--space-4)' }}
            onClick={onInstall}
          >
            <Download size={16} />
            {t('btnInstallApp', currentLang)}
          </button>
        )}
      </div>

      <p
        style={{
          marginTop: 'var(--space-6)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        Uso restrito a colaboradores autorizados · Atividades são registradas
      </p>
    </div>
  );
}
