import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import FrotaInfratech from '@/app/page';
import type { UserProfile } from '@/types';

// O app fala com o Firestore na montagem. Aqui o interesse e a camada de UI,
// entao o SDK e trocado por um duble que simula "documento remoto ainda nao
// existe" - o mesmo caminho que faz o app cair no seed de initialVehicles.
jest.mock('@/lib/firebase', () => ({ db: {}, auth: {} }));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  setDoc: jest.fn(() => Promise.resolve()),
  onSnapshot: jest.fn((_ref: unknown, onNext: (snap: unknown) => void) => {
    onNext({ exists: () => false, data: () => ({}) });
    return () => {};
  }),
}));

// jsPDF nao roda em jsdom (depende de canvas). Como nenhum teste aqui verifica
// o PDF em si, so o caminho ate o botao, o modulo inteiro vira stub.
jest.mock('@/lib/pdf', () => ({ generateFleetReport: jest.fn() }));

// --- Duble controlavel do useAuth -------------------------------------------
// Mockar o hook, e nao o SDK do Firebase, mantem os testes sobre o que importa:
// como a interface reage a cada estado de sessao. O comportamento do Firebase
// Auth em si e responsabilidade dele, nao desta suite.
const authMock = {
  profile: null as UserProfile | null,
  loading: false,
  isActive: false,
  isAdmin: false,
  isOperator: false,
  status: null as string | null,
  signIn: jest.fn(() => Promise.resolve()),
  signUp: jest.fn(() => Promise.resolve()),
  logout: jest.fn(),
  resetPassword: jest.fn(() => Promise.resolve()),
  reauthenticate: jest.fn(() => Promise.resolve()),
};

jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => authMock,
  authErrorMessage: (c: string) => c,
}));

function comoDeslogado() {
  Object.assign(authMock, { profile: null, isActive: false, isAdmin: false, status: null });
}

function comoUsuario(
  level: UserProfile['level'] = 'usuario',
  status: UserProfile['status'] = 'ativo'
) {
  Object.assign(authMock, {
    profile: { uid: 'u1', email: 'a@b.com', displayName: 'Teste', level, status } as UserProfile,
    isActive: status === 'ativo',
    isAdmin: status === 'ativo' && ['admin', 'admin_master'].includes(level),
    isOperator: status === 'ativo' && ['operador', 'admin', 'admin_master'].includes(level),
    status,
  });
}

/** Navega pela sidebar, que e o unico caminho real entre paginas. */
function navegarPara(rotulo: string | RegExp) {
  const sidebar = screen.getByRole('complementary');
  fireEvent.click(within(sidebar).getByRole('button', { name: rotulo }));
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  authMock.loading = false;
  // Um erro de console durante a navegacao quase sempre significa render
  // quebrado ou prop faltando. O teste falha nele de proposito.
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});

describe('Portão de acesso', () => {
  it('sem sessão, mostra o login e nenhum dado da frota', () => {
    comoDeslogado();
    render(<FrotaInfratech />);
    expect(screen.getByRole('heading', { name: /Gestão de Frota/i })).toBeInTheDocument();
    expect(screen.queryByText('TN-01')).not.toBeInTheDocument();
  });

  it('autentica com e-mail e senha', async () => {
    comoDeslogado();
    render(<FrotaInfratech />);

    fireEvent.change(screen.getByLabelText(/E-mail corporativo/i), {
      target: { value: 'joao@infratech.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Senha$/i), { target: { value: 'senhaSuperLonga1' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() =>
      expect(authMock.signIn).toHaveBeenCalledWith('joao@infratech.com', 'senhaSuperLonga1')
    );
  });

  it('o autocadastro pede os dados declarados e avisa que passa por aprovação', async () => {
    comoDeslogado();
    render(<FrotaInfratech />);
    fireEvent.click(screen.getByRole('button', { name: /Primeiro acesso/i }));

    expect(screen.getByLabelText(/Nome completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/RAC02/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ID crachá/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Gerência/i)).toBeInTheDocument();
    expect(screen.getByText(/conferidos por um administrador ou operador/i)).toBeInTheDocument();
  });

  it('recusa senha curta no cadastro sem chamar o servidor', async () => {
    comoDeslogado();
    render(<FrotaInfratech />);
    fireEvent.click(screen.getByRole('button', { name: /Primeiro acesso/i }));

    const senha = screen.getByLabelText(/Senha \(mínimo/i);
    expect(senha).toHaveAttribute('minLength', '12');

    fireEvent.change(senha, { target: { value: 'curta' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar cadastro/i }));

    // Duas barreiras: a validação nativa impede o submit, e o handler recusa
    // de novo caso o submit chegue por outro caminho. O que importa aqui é que
    // nada sai para o servidor.
    await waitFor(() => expect(authMock.signUp).not.toHaveBeenCalled());
  });

  it('conta pendente não vê a frota e recebe explicação própria', () => {
    comoUsuario('usuario', 'pendente');
    render(<FrotaInfratech />);

    expect(screen.getByRole('heading', { name: /Cadastro em análise/i })).toBeInTheDocument();
    expect(screen.queryByText('TN-01')).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('conta bloqueada recebe mensagem diferente de conta pendente', () => {
    comoUsuario('usuario', 'bloqueado');
    render(<FrotaInfratech />);

    expect(screen.getByRole('heading', { name: /Acesso bloqueado/i })).toBeInTheDocument();
    expect(screen.queryByText(/Cadastro em análise/i)).not.toBeInTheDocument();
  });
});

describe('Aplicação — usuário comum ativo', () => {
  const entrar = async () => {
    comoUsuario('usuario', 'ativo');
    render(<FrotaInfratech />);
    await waitFor(() => expect(screen.getByRole('complementary')).toBeInTheDocument());
  };

  it('lista a frota', async () => {
    await entrar();
    expect(screen.getByText('TN-01')).toBeInTheDocument();
    expect(screen.getByText(/de 13 veículos/i)).toBeInTheDocument();
  });

  it('não expõe ações de administrador', async () => {
    await entrar();
    expect(screen.getByText('Operador')).toBeInTheDocument();
    const sidebar = screen.getByRole('complementary');
    expect(within(sidebar).queryByRole('button', { name: /Administra/i })).not.toBeInTheDocument();
  });

  it('filtra a frota pela barra de filtros', async () => {
    await entrar();
    const filtros = screen.getByRole('radiogroup', { name: /Filtrar frota/i });
    fireEvent.click(within(filtros).getByRole('radio', { name: /Disponíveis/i }));

    await waitFor(() => {
      expect(screen.getByText(/de 13 veículos/i).textContent).toMatch(/^9 de 13/);
    });
  });

  it('mantém o filtro num único lugar — os KPIs são leitura, não controle', async () => {
    await entrar();
    expect(screen.queryByRole('button', { name: /Frota total/i })).not.toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /Filtrar frota/i })).toBeInTheDocument();
  });

  it('busca por placa e oferece limpar quando não há resultado', async () => {
    await entrar();
    const busca = screen.getByRole('searchbox');

    fireEvent.change(busca, { target: { value: 'FQQ8B72' } });
    await waitFor(() => expect(screen.getByText(/^1 de 13/)).toBeInTheDocument());

    fireEvent.change(busca, { target: { value: 'zzzzz' } });
    await waitFor(() => expect(screen.getByText(/Nenhum veículo encontrado/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Limpar filtros/i })).toBeInTheDocument();
  });

  it('abre o detalhe do veículo com as ações de operação', async () => {
    await entrar();
    fireEvent.click(screen.getByRole('button', { name: /TN-01.*Abrir detalhes/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /Retirar/i })).toBeInTheDocument();
  });

  it('navega por todas as páginas sem quebrar', async () => {
    await entrar();

    navegarPara(/Métricas/i);
    expect(await screen.findByRole('heading', { name: /Métricas de Uso/i })).toBeInTheDocument();

    navegarPara(/Fórum/i);
    expect(await screen.findByRole('heading', { name: /Fórum Operacional/i })).toBeInTheDocument();

    navegarPara(/Regionais/i);
    expect(
      await screen.findByRole('heading', { name: /Regionais e Gerências/i })
    ).toBeInTheDocument();

    navegarPara(/Motoristas/i);
    expect(await screen.findByRole('heading', { name: /^Motoristas$/i })).toBeInTheDocument();

    navegarPara(/Configurações/i);
    expect(await screen.findByRole('heading', { name: /^Configurações$/i })).toBeInTheDocument();
  });

  it('alterna o tema pela barra superior', async () => {
    await entrar();
    fireEvent.click(screen.getByRole('button', { name: /Ativar tema escuro/i }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));

    fireEvent.click(screen.getByRole('button', { name: /Ativar tema claro/i }));
    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'));
  });

  it('encerra a sessão pelo Firebase, não pelo localStorage', async () => {
    await entrar();
    navegarPara(/Configurações/i);
    fireEvent.click(await screen.findByRole('button', { name: /Sair/i }));
    expect(authMock.logout).toHaveBeenCalled();
  });

  it('abre o painel de histórico pela sidebar', async () => {
    await entrar();
    navegarPara(/Histórico/i);
    expect(await screen.findByText(/Nenhum registro/i)).toBeInTheDocument();
  });
});

describe('Aplicação — administrador', () => {
  const entrarComoAdmin = async () => {
    comoUsuario('admin', 'ativo');
    render(<FrotaInfratech />);
    await waitFor(() => expect(screen.getByRole('complementary')).toBeInTheDocument());
  };

  it('expõe a área administrativa', async () => {
    await entrarComoAdmin();
    expect(screen.getByText('Admin')).toBeInTheDocument();

    const sidebar = screen.getByRole('complementary');
    expect(within(sidebar).getByRole('button', { name: /Administra/i })).toBeInTheDocument();
  });

  it('percorre a área administrativa', async () => {
    await entrarComoAdmin();
    const sidebar = screen.getByRole('complementary');
    fireEvent.click(within(sidebar).getByRole('button', { name: /Administra/i }));

    expect(await screen.findByRole('heading', { name: /Administra/i })).toBeInTheDocument();
    expect(screen.getAllByText('TN-01').length).toBeGreaterThan(0);
  });

  it('exige a senha antes de excluir veículo, e não um PIN do bundle', async () => {
    await entrarComoAdmin();

    fireEvent.click(screen.getByRole('button', { name: /TN-01.*Abrir detalhes/i }));
    const detalhe = await screen.findByRole('dialog');
    fireEvent.click(within(detalhe).getByRole('button', { name: /Editar/i }));

    const gestao = await screen.findByRole('dialog');
    fireEvent.click(within(gestao).getByRole('button', { name: /Excluir/i }));

    const confirmacao = await screen.findByRole('dialog');
    expect(within(confirmacao).getByLabelText(/Sua senha/i)).toBeInTheDocument();
    // Regressao: o fluxo antigo pedia um PIN comparado com uma constante
    // embutida no bundle, legivel por qualquer pessoa.
    expect(screen.queryByLabelText(/PIN/i)).not.toBeInTheDocument();
  });

  it('recusa retirada com quilometragem vazia em vez de gravar NaN', async () => {
    await entrarComoAdmin();

    fireEvent.click(screen.getByRole('button', { name: /TN-01.*Abrir detalhes/i }));
    const detalhe = await screen.findByRole('dialog');
    fireEvent.click(within(detalhe).getByRole('button', { name: /Retirar/i }));

    const retirada = await screen.findByRole('dialog');
    fireEvent.change(within(retirada).getByLabelText(/Motorista/i), {
      target: { value: 'Robson Teste' },
    });
    within(retirada)
      .getAllByRole('checkbox')
      .forEach((c) => fireEvent.click(c));
    fireEvent.click(within(retirada).getByRole('button', { name: /Confirmar/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('Robson Teste')).not.toBeInTheDocument();
  });

  it('completa a retirada com motorista, KM e checklist preenchidos', async () => {
    await entrarComoAdmin();

    fireEvent.click(screen.getByRole('button', { name: /TN-01.*Abrir detalhes/i }));
    const detalhe = await screen.findByRole('dialog');
    fireEvent.click(within(detalhe).getByRole('button', { name: /Retirar/i }));

    const retirada = await screen.findByRole('dialog');
    fireEvent.change(within(retirada).getByLabelText(/Motorista/i), {
      target: { value: 'Robson Teste' },
    });
    fireEvent.change(within(retirada).getByLabelText(/Quilometragem|KM/i), {
      target: { value: '37500' },
    });
    within(retirada)
      .getAllByRole('checkbox')
      .forEach((c) => fireEvent.click(c));

    fireEvent.click(within(retirada).getByRole('button', { name: /Confirmar/i }));
    await waitFor(() => expect(screen.getByText('Robson Teste')).toBeInTheDocument());
  });
});
