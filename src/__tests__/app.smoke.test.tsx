import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import FrotaInfratech from '@/app/page'

// O app fala com o Firestore na montagem. Aqui o interesse e a camada de UI,
// entao o SDK e trocado por um duble que simula "documento remoto ainda nao
// existe" - o mesmo caminho que faz o app cair no seed de initialVehicles.
jest.mock('@/lib/firebase', () => ({ db: {} }))

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  setDoc: jest.fn(() => Promise.resolve()),
  onSnapshot: jest.fn((_ref: unknown, onNext: (snap: unknown) => void) => {
    onNext({ exists: () => false, data: () => ({}) })
    return () => {}
  }),
}))

// jsPDF nao roda em jsdom (depende de canvas). Como nenhum teste aqui verifica
// o PDF em si, so o caminho ate o botao, o modulo inteiro vira stub.
jest.mock('@/lib/pdf', () => ({ generateFleetReport: jest.fn() }))

/** Navega pela sidebar, que e o unico caminho real entre paginas. */
function navegarPara(rotulo: string | RegExp) {
  const sidebar = screen.getByRole('complementary')
  fireEvent.click(within(sidebar).getByRole('button', { name: rotulo }))
}

describe('Aplicação — fluxo completo', () => {
  let consoleError: jest.SpyInstance

  beforeEach(() => {
    localStorage.clear()
    // Um erro de console durante a navegacao quase sempre significa render
    // quebrado ou prop faltando. O teste falha nele de proposito.
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  const entrar = async () => {
    render(<FrotaInfratech />)
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }))
    await waitFor(() => expect(screen.getByRole('complementary')).toBeInTheDocument())
  }

  it('mostra a tela de login antes de qualquer dado da frota', () => {
    render(<FrotaInfratech />)
    expect(screen.getByRole('heading', { name: /Gestão de Frota/i })).toBeInTheDocument()
    expect(screen.queryByText('TN-01')).not.toBeInTheDocument()
  })

  it('revela o formulário de PIN e rejeita PIN inválido', () => {
    render(<FrotaInfratech />)
    fireEvent.click(screen.getByRole('button', { name: /Acesso administrativo/i }))

    const pin = screen.getByLabelText(/PIN de administrador/i)
    fireEvent.change(pin, { target: { value: '0000' } })
    fireEvent.click(screen.getByRole('button', { name: /Entrar como administrador/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/PIN incorreto/i)
  })

  it('entra como operador e lista a frota', async () => {
    await entrar()
    expect(screen.getByText('TN-01')).toBeInTheDocument()
    expect(screen.getByText(/de 13 veículos/i)).toBeInTheDocument()
  })

  it('não expõe ações de administrador para operador comum', async () => {
    await entrar()
    expect(screen.getByText('Operador')).toBeInTheDocument()
    const sidebar = screen.getByRole('complementary')
    expect(within(sidebar).queryByRole('button', { name: /Administra/i })).not.toBeInTheDocument()
  })

  it('filtra a frota pela barra de filtros', async () => {
    await entrar()
    const filtros = screen.getByRole('radiogroup', { name: /Filtrar frota/i })
    fireEvent.click(within(filtros).getByRole('radio', { name: /Disponíveis/i }))

    await waitFor(() => {
      expect(screen.getByText(/de 13 veículos/i).textContent).toMatch(/^9 de 13/)
    })
  })

  it('mantém o filtro num único lugar — os KPIs são leitura, não controle', async () => {
    await entrar()
    // Regressao: os cards de KPI e os chips mostravam a mesma contagem e
    // aplicavam o mesmo filtro, empilhados na mesma tela.
    expect(screen.queryByRole('button', { name: /Frota total/i })).not.toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: /Filtrar frota/i })).toBeInTheDocument()
  })

  it('busca por placa e oferece limpar quando não há resultado', async () => {
    await entrar()
    const busca = screen.getByRole('searchbox')

    fireEvent.change(busca, { target: { value: 'FQQ8B72' } })
    await waitFor(() => expect(screen.getByText(/^1 de 13/)).toBeInTheDocument())
    expect(screen.getByText('TN-01')).toBeInTheDocument()

    fireEvent.change(busca, { target: { value: 'zzzzz' } })
    await waitFor(() => expect(screen.getByText(/Nenhum veículo encontrado/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Limpar filtros/i })).toBeInTheDocument()
  })

  it('abre o detalhe do veículo com as ações de operação', async () => {
    await entrar()
    fireEvent.click(screen.getByRole('button', { name: /TN-01.*Abrir detalhes/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /Retirar/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Lavador/i })).toBeInTheDocument()
  })

  it('navega por todas as páginas sem quebrar', async () => {
    await entrar()

    navegarPara(/Métricas/i)
    expect(await screen.findByRole('heading', { name: /Métricas de Uso/i })).toBeInTheDocument()

    navegarPara(/Fórum/i)
    expect(await screen.findByRole('heading', { name: /Fórum Operacional/i })).toBeInTheDocument()

    navegarPara(/Regionais/i)
    expect(await screen.findByRole('heading', { name: /Regionais e Gerências/i })).toBeInTheDocument()

    navegarPara(/Motoristas/i)
    expect(await screen.findByRole('heading', { name: /^Motoristas$/i })).toBeInTheDocument()

    navegarPara(/Configurações/i)
    expect(await screen.findByRole('heading', { name: /^Configurações$/i })).toBeInTheDocument()
  })

  it('alterna o tema pela barra superior', async () => {
    await entrar()
    fireEvent.click(screen.getByRole('button', { name: /Ativar tema escuro/i }))

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    fireEvent.click(screen.getByRole('button', { name: /Ativar tema claro/i }))
    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'))
  })

  it('mostra estado vazio nos motoristas quando não há histórico', async () => {
    await entrar()
    navegarPara(/Motoristas/i)
    expect(await screen.findByText(/Nenhum registro nos últimos 30 dias/i)).toBeInTheDocument()
  })

  it('abre a estrutura organizacional com as duas regionais semente', async () => {
    await entrar()
    navegarPara(/Regionais/i)

    const abas = await screen.findAllByRole('tab')
    expect(abas).toHaveLength(2)
    expect(abas[0]).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(abas[1])
    await waitFor(() => expect(abas[1]).toHaveAttribute('aria-selected', 'true'))
  })

  it('abre o painel de histórico pela sidebar', async () => {
    await entrar()
    navegarPara(/Histórico/i)
    expect(await screen.findByText(/Nenhum registro/i)).toBeInTheDocument()
  })
})

describe('Aplicação — sessão administrativa', () => {
  let consoleError: jest.SpyInstance

  beforeEach(() => {
    localStorage.clear()
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  /** Entra direto como admin: o PIN e so uma trava de UI e o estado dele mora
   *  no localStorage, entao semear a chave evita depender da variavel de
   *  ambiente do PIN dentro do teste. */
  const entrarComoAdmin = async () => {
    localStorage.setItem('isAdmin', 'true')
    localStorage.setItem('frota_entered', 'true')
    render(<FrotaInfratech />)
    await waitFor(() => expect(screen.getByRole('complementary')).toBeInTheDocument())
  }

  it('expõe a área administrativa e o botão de adicionar veículo', async () => {
    await entrarComoAdmin()
    expect(screen.getByText('Admin')).toBeInTheDocument()

    const sidebar = screen.getByRole('complementary')
    expect(within(sidebar).getByRole('button', { name: /Administra/i })).toBeInTheDocument()
  })

  it('abre o cadastro de veículo sem quebrar', async () => {
    await entrarComoAdmin()
    fireEvent.click(screen.getAllByRole('button', { name: /Adicionar/i })[0])

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName()
    expect(dialog).toHaveAccessibleDescription()
  })

  it('percorre a área administrativa', async () => {
    await entrarComoAdmin()
    const sidebar = screen.getByRole('complementary')
    fireEvent.click(within(sidebar).getByRole('button', { name: /Administra/i }))

    expect(await screen.findByRole('heading', { name: /Administra/i })).toBeInTheDocument()
    // A tabela de veiculos precisa listar a frota semente.
    expect(screen.getAllByText('TN-01').length).toBeGreaterThan(0)
  })

  const abrirRetirada = async () => {
    fireEvent.click(screen.getByRole('button', { name: /TN-01.*Abrir detalhes/i }))
    const detalhe = await screen.findByRole('dialog')
    fireEvent.click(within(detalhe).getByRole('button', { name: /Retirar/i }))
    return screen.findByRole('dialog')
  }

  it('não deixa retirar veículo com o checklist incompleto', async () => {
    await entrarComoAdmin()
    const retirada = await abrirRetirada()

    fireEvent.change(within(retirada).getByLabelText(/Motorista/i), {
      target: { value: 'Robson Teste' },
    })

    expect(within(retirada).getByRole('button', { name: /Confirmar/i })).toBeDisabled()
  })

  it('recusa retirada com quilometragem vazia em vez de gravar NaN', async () => {
    await entrarComoAdmin()
    const retirada = await abrirRetirada()

    fireEvent.change(within(retirada).getByLabelText(/Motorista/i), {
      target: { value: 'Robson Teste' },
    })
    within(retirada).getAllByRole('checkbox').forEach(c => fireEvent.click(c))
    fireEvent.click(within(retirada).getByRole('button', { name: /Confirmar/i }))

    // Regressao: `parseInt('')` e NaN, e `NaN < vehicle.km` e false - a guarda
    // passava batido e o veiculo era salvo com km invalido.
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByText('Robson Teste')).not.toBeInTheDocument()
  })

  it('completa a retirada com motorista, KM e checklist preenchidos', async () => {
    await entrarComoAdmin()
    const retirada = await abrirRetirada()

    fireEvent.change(within(retirada).getByLabelText(/Motorista/i), {
      target: { value: 'Robson Teste' },
    })
    fireEvent.change(within(retirada).getByLabelText(/Quilometragem|KM/i), {
      target: { value: '37500' },
    })
    within(retirada).getAllByRole('checkbox').forEach(c => fireEvent.click(c))

    const confirmar = within(retirada).getByRole('button', { name: /Confirmar/i })
    expect(confirmar).toBeEnabled()
    fireEvent.click(confirmar)

    // O condutor passa a aparecer no mini card da frota.
    await waitFor(() => expect(screen.getByText('Robson Teste')).toBeInTheDocument())
  })
})
