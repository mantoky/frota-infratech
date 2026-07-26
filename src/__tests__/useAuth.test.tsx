/**
 * Testes do cadastro — cobrem duas falhas reais encontradas na primeira
 * tentativa de ativar a Fase 0 em produção.
 */
import { renderHook } from '@testing-library/react';
import { authErrorMessage } from '@/lib/hooks/useAuth';

const mockCreateUser = jest.fn();
const mockUpdateProfile = jest.fn();
const mockDeleteUser = jest.fn();
const mockSetDoc = jest.fn();

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...a: unknown[]) => mockCreateUser(...a),
  updateProfile: (...a: unknown[]) => mockUpdateProfile(...a),
  deleteUser: (...a: unknown[]) => mockDeleteUser(...a),
  onAuthStateChanged: jest.fn(() => () => {}),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signOut: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  EmailAuthProvider: { credential: jest.fn() },
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, col, id) => ({ col, id })),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: (...a: unknown[]) => mockSetDoc(...a),
  serverTimestamp: jest.fn(() => 'TS'),
}));

jest.mock('@/lib/firebase', () => ({ db: {}, getAppAuth: () => ({}) }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useAuth } = require('@/lib/hooks/useAuth');

describe('authErrorMessage', () => {
  it('traduz erros de autenticação', () => {
    expect(authErrorMessage('auth/email-already-in-use')).toMatch(/já existe/i);
    expect(authErrorMessage('auth/operation-not-allowed')).toMatch(/não está habilitado/i);
  });

  it('traduz erro do Firestore em vez de cair no texto genérico', () => {
    // Regressao: o cadastro toca Auth e Firestore. Quando o Firestore recusava,
    // o codigo era `permission-denied` - sem prefixo `auth/` - e a tela dizia
    // apenas "Nao foi possivel concluir. Tente novamente", numa situacao que
    // nunca se resolvia tentando de novo.
    const msg = authErrorMessage('permission-denied');
    expect(msg).not.toMatch(/tente novamente/i);
    expect(msg).toMatch(/regras de segurança/i);
  });

  it('mantém um texto de último recurso para código desconhecido', () => {
    expect(authErrorMessage('codigo/inexistente')).toMatch(/não foi possível/i);
  });
});

describe('signUp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateUser.mockResolvedValue({ user: { uid: 'u1' } });
    mockUpdateProfile.mockResolvedValue(undefined);
    mockSetDoc.mockResolvedValue(undefined);
    mockDeleteUser.mockResolvedValue(undefined);
  });

  const dados = {
    nomeCompleto: 'João Silva',
    email: '  Joao.Silva@Infratech.COM  ',
    senha: 'senhaComDozeMais',
    gerencia: 'G',
    coordenador: 'C',
    gestorStaff: 'S',
    funcao: 'F',
    empresa: 'E',
    idCracha: '123',
    rac02: 'R',
    prontosCadastrado: true,
  };

  /**
   * `renderHook` monta o hook de verdade num componente descartavel. A
   * alternativa - chamar `useAuth()` direto - viola as regras dos hooks e nao
   * exercitaria o caminho real.
   */
  const pegarSignUp = () => renderHook(() => useAuth()).result.current.signUp;

  it('normaliza o e-mail para minúsculas antes de gravar', async () => {
    await pegarSignUp()(dados);

    // Regressao: o Firebase normaliza o e-mail no token, entao
    // `auth.token.email` vem sempre minusculo. A rule compara o campo gravado
    // com esse token - qualquer maiuscula digitada fazia os dois divergirem e
    // o cadastro era recusado com permission-denied.
    expect(mockCreateUser).toHaveBeenCalledWith({}, 'joao.silva@infratech.com', dados.senha);
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({
      email: 'joao.silva@infratech.com',
      level: 'usuario',
      status: 'pendente',
    });
  });

  it('desfaz a conta no Auth quando a gravação do perfil falha', async () => {
    const falha = Object.assign(new Error('denied'), { code: 'permission-denied' });
    mockSetDoc.mockRejectedValue(falha);

    await expect(pegarSignUp()(dados)).rejects.toThrow('denied');

    // Sem isto a pessoa fica presa: a conta existe no Auth, nao tem perfil, e a
    // proxima tentativa devolve "e-mail ja em uso" para sempre.
    expect(mockDeleteUser).toHaveBeenCalledWith({ uid: 'u1' });
  });

  it('nunca envia nível ou status escolhidos pelo cliente', async () => {
    await pegarSignUp()({ ...dados, level: 'admin_master', status: 'ativo' } as never);

    const gravado = mockSetDoc.mock.calls[0][1];
    expect(gravado.level).toBe('usuario');
    expect(gravado.status).toBe('pendente');
  });
});
