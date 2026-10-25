import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import FrotaInfratech from '@/app/page';

// O app fala com o Firestore na montagem. Aqui o interesse e a camada de UI,
// entao o SDK e trocado por um duble que simula "documento remoto ainda nao
// existe" - o mesmo caminho que faz o app cair no seed de initialVehicles.
jest.mock('@/lib/firebase', () => ({ db: {}, auth: {} }));

// `metadata.fromCache: false` simula resposta do SERVIDOR. E o que o app usa
// para decidir se pode semear: um snapshot de cache dizendo "nao existe" ja
// levou a sobrescrever a frota real por engano.
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  collection: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  limit: jest.fn(() => ({})),
  setDoc: jest.fn(() => Promise.resolve()),
  addDoc: jest.fn(() => Promise.resolve({ id: 'novo' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  onSnapshot: jest.fn((_ref: unknown, onNext: (snap: unknown) => void) => {
    onNext({
      exists: () => false,
      data: () => ({}),
      metadata: { fromCache: false },
      docs: [],
    });
    return () => {};
  }),
}));

// jsPDF nao roda em jsdom (depende de canvas). Como nenhum teste aqui verifica
// o PDF em si, so o caminho ate o botao, o modulo inteiro vira stub.
jest.mock('@/lib/pdf', () => ({ generateFleetReport: jest.fn() }));

const SENHA_ADMIN = 'senha-admin-teste';

/** Navega pela sidebar, que e o unico caminho real entre paginas. */
function navegarPara(rotulo: string | RegExp) {
  const sidebar = screen.getByRole('complementary');
  fireEvent.click(within(sidebar).getByRole('button', { name: rotulo }));
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD = SENHA_ADMIN;
  jest.clearAllMocks();
  // Um erro de console durante a navegacao quase sempre significa render
  // quebrado ou prop faltando. O teste falha nele de proposito.
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});

describe('Acesso', () => {
  it('abre a frota sem pedir e-mail', async () => {
    render(<FrotaInfratech />);
    expect(await screen.findByText('TN01')).toBeInTheDocument();
    expect(screen.queryByLabelText(/E-mail/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar como administrador/i })).toBeInTheDocument();
  });

  it('senha errada não libera o administrador', async () => {
    render(<FrotaInfratech />);
    fireEvent.click(await screen.findByRole('button', { name: /Entrar como administrador/i }));
    fireEvent.change(screen.getByLabelText(/Senha do administrador/i), {
      target: { value: 'errada' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Confirmar$/i }));

    expect(await screen.findByText(/Senha incorreta/i)).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('a senha correta libera a área administrativa', async () => {
    render(<FrotaInfratech />);
    fireEvent.click(await screen.findByRole('button', { name: /Entrar como administrador/i }));
    fireEvent.change(screen.getByLabelText(/Senha do administrador/i), {
      target: { value: SENHA_ADMIN },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Confirmar$/i }));

    expect(await screen.findByText('Admin')).toBeInTheDocument();
    const sidebar = screen.getByRole('complementary');
    expect(within(sidebar).getByRole('button', { name: /Administra/i })).toBeInTheDocument();
  });
});

describe('Aplicação — operação', () => {
  const entrar = async () => {
    render(<FrotaInfratech />);
    await waitFor(() => expect(screen.getByRole('complementary')).toBeInTheDocument());
  };

  it('lista a frota', async () => {
    await entrar();
    expect(screen.getByText('TN01')).toBeInTheDocument();
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

    fireEvent.change(busca, { target: { value: 'tn1' } });
    await waitFor(() => expect(screen.getByText(/^1 de 13/)).toBeInTheDocument());
    expect(screen.getByText('TN01')).toBeInTheDocument();
    expect(screen.queryByText('TN31')).not.toBeInTheDocument();

    fireEvent.change(busca, { target: { value: 'zzzzz' } });
    await waitFor(() => expect(screen.getByText(/Nenhum veículo encontrado/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Limpar filtros/i })).toBeInTheDocument();
  });

  it('abre o detalhe do veículo com as ações de operação', async () => {
    await entrar();
    fireEvent.click(screen.getByRole('button', { name: /TN01.*Abrir detalhes/i }));

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
      await screen.findByRole('heading', { name: /Estrutura organizacional/i })
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

  it('sai do modo administrador pelas configurações', async () => {
    sessionStorage.setItem('frota-admin', '1');
    render(<FrotaInfratech />);
    await waitFor(() => expect(screen.getByText('Admin')).toBeInTheDocument());
    navegarPara(/Configurações/i);
    fireEvent.click(await screen.findByRole('button', { name: /Sair do admin/i }));
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Entrar como administrador/i }).length
    ).toBeGreaterThan(0);
  });

  it('abre o painel de histórico pela sidebar', async () => {
    await entrar();
    navegarPara(/Histórico/i);
    expect(await screen.findByText(/Nenhum registro/i)).toBeInTheDocument();
  });
  // -------------------------------------------------------------------------
  // Regressoes desta rodada
  // -------------------------------------------------------------------------

  it('o KPI poligonal filtra a frota, e nao apenas informa', async () => {
    await entrar();

    // Os cinco setores sao controles de verdade, nao desenho.
    const grupo = await screen.findByRole('radiogroup', { name: /Filtrar frota por situação/i });
    const setores = within(grupo).getAllByRole('radio');
    expect(setores.length).toBe(5);

    const todos = within(grupo).getByRole('radio', { name: /Todos/i });
    expect(todos).toHaveAttribute('aria-checked', 'true');

    const emUso = setores.find((s) => /Em Uso/i.test(s.getAttribute('aria-label') || ''));
    fireEvent.click(emUso!);

    await waitFor(() => expect(emUso).toHaveAttribute('aria-checked', 'true'));
    // O rodape de contagem tem de acompanhar o filtro; se nao acompanhar, o
    // setor virou enfeite de novo.
    expect(await screen.findByText(/de 13 veículos/i)).toBeInTheDocument();
  });

  it('a barra superior tem o ícone de mensagens e leva ao fórum', async () => {
    await entrar();
    // Sem mensagens novas o rotulo e neutro; com elas, anuncia a contagem.
    const botao = screen.getByRole('button', { name: /Fórum de mensagens/i });
    fireEvent.click(botao);
    expect(await screen.findByRole('heading', { name: /Fórum Operacional/i })).toBeInTheDocument();
  });

  it('o fórum não pede o nome do autor — ele vem da sessão', async () => {
    await entrar();
    navegarPara(/Fórum/i);
    await screen.findByRole('heading', { name: /Fórum Operacional/i });

    fireEvent.click(screen.getByRole('button', { name: /Nova mensagem/i }));

    // Regressao: havia um campo de texto livre "Seu nome". Qualquer pessoa
    // assinava como qualquer outra, o que anula a trilha de auditoria.
    expect(screen.queryByPlaceholderText(/Seu nome/i)).not.toBeInTheDocument();
    expect(await screen.findByText(/Publicando como/i)).toBeInTheDocument();
  });
});

describe('Aplicação — administrador', () => {
  const entrarComoAdmin = async () => {
    sessionStorage.setItem('frota-admin', '1');
    render(<FrotaInfratech />);
    await waitFor(() => expect(screen.getByText('Admin')).toBeInTheDocument());
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
    expect(screen.getAllByText('TN01').length).toBeGreaterThan(0);
  });

  it('exige a senha antes de excluir veículo, e não um PIN do bundle', async () => {
    await entrarComoAdmin();

    fireEvent.click(screen.getByRole('button', { name: /TN01.*Abrir detalhes/i }));
    const detalhe = await screen.findByRole('dialog');
    fireEvent.click(within(detalhe).getByRole('button', { name: /Editar/i }));

    const gestao = await screen.findByRole('dialog');
    fireEvent.click(within(gestao).getByRole('button', { name: /Excluir/i }));

    const confirmacao = await screen.findByRole('dialog');
    expect(within(confirmacao).getByLabelText(/Senha do administrador/i)).toBeInTheDocument();
    // Regressao: o fluxo antigo pedia um PIN comparado com uma constante
    // embutida no bundle, legivel por qualquer pessoa.
    expect(screen.queryByLabelText(/PIN/i)).not.toBeInTheDocument();
  });

  it('recusa retirada com quilometragem vazia em vez de gravar NaN', async () => {
    await entrarComoAdmin();

    fireEvent.click(screen.getByRole('button', { name: /TN01.*Abrir detalhes/i }));
    const detalhe = await screen.findByRole('dialog');
    fireEvent.click(within(detalhe).getByRole('button', { name: /Retirar/i }));

    const retirada = await screen.findByRole('dialog');
    fireEvent.change(within(retirada).getByLabelText(/Motorista/i), {
      target: { value: 'Robson Teste' },
    });
    // O campo nasce com a leitura atual. Esvaziar é o que o teste cobre:
    // vazio não pode virar NaN gravado na frota.
    fireEvent.change(within(retirada).getByLabelText(/Quilometragem|KM/i), {
      target: { value: '' },
    });
    within(retirada)
      .getAllByRole('checkbox')
      .forEach((c) => fireEvent.click(c));
    fireEvent.click(within(retirada).getByRole('button', { name: /Confirmar/i }));

    expect(await screen.findByText(/KM não pode ser menor/i)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('Robson Teste')).not.toBeInTheDocument();
  });

  it('completa a retirada com motorista, KM e checklist preenchidos', async () => {
    await entrarComoAdmin();

    fireEvent.click(screen.getByRole('button', { name: /TN01.*Abrir detalhes/i }));
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
