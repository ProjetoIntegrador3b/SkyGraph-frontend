import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, vi } from 'vitest'
import { mockApi } from '../test/api'
import Home from './Home'

async function search(origin = 'GRU', destination = 'JFK') {
  await userEvent.type(screen.getByLabelText('Origem'), origin)
  await userEvent.type(screen.getByLabelText('Destino'), destination)
  await userEvent.click(screen.getByLabelText('Ida'))
  // Page forward one month so the days picked below are always in the
  // future -- days before today are disabled and would not register.
  await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }))
  await userEvent.click(screen.getAllByRole('button', { name: /15 de/ })[0])
  // Each pick closes the calendar; it reopens on the same month.
  await userEvent.click(screen.getByLabelText('Volta'))
  await userEvent.click(screen.getAllByRole('button', { name: /20 de/ })[0])
  await userEvent.click(
    screen.getByRole('button', { name: 'Buscar melhor rota' }),
  )
}

describe('Home', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('renders the route search form', () => {
    mockApi()
    render(<Home />)

    expect(
      screen.getByRole('heading', {
        name: 'Encontre a melhor rota para sua viagem',
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Origem')).toBeInTheDocument()
    expect(screen.getByLabelText('Destino')).toBeInTheDocument()
    expect(screen.getByLabelText('Ida')).toBeInTheDocument()
    expect(screen.getByLabelText('Volta')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Buscar melhor rota' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ativar modo claro' }),
    ).toBeInTheDocument()
  })

  it('toggles and persists the visual theme', async () => {
    mockApi()
    const user = userEvent.setup()
    render(<Home />)

    await user.click(screen.getByRole('button', { name: 'Ativar modo claro' }))

    expect(
      screen.getByRole('button', { name: 'Ativar modo noturno' }),
    ).toBeInTheDocument()
    expect(localStorage.getItem('skygraph-theme')).toBe('light')
  })

  it('suggests the airports returned by the API', async () => {
    const fetch = mockApi()
    render(<Home />)

    await userEvent.click(screen.getByLabelText('Origem'))

    expect(
      await screen.findByRole('option', {
        name: 'Brasil - GRU - Aeroporto Internacional de Guarulhos',
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(2)
    expect(fetch).toHaveBeenCalledWith('/api/airports?pageSize=200', undefined)
  })

  it('displays the cheapest route returned by the API', async () => {
    const fetch = mockApi()
    render(<Home />)

    await search()

    const legs = await screen.findByRole('list', { name: 'Trechos da rota' })
    expect(within(legs).getAllByRole('listitem')).toHaveLength(2)
    expect(
      within(legs).getByText('GRU · São Paulo → FOR · Fortaleza'),
    ).toBeInTheDocument()
    expect(screen.getByText('1 conexão')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      '/api/routes',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringMatching(
          /"origin":"GRU".*"destination":"JFK".*"departureDate":"\d{4}-\d{2}-15".*"returnDate":"\d{4}-\d{2}-20"/,
        ),
      }),
    )
  })

  it('says so when no route fits the period', async () => {
    mockApi({ body: { route: null } })
    render(<Home />)

    await search()

    expect(
      await screen.findByText(/Nenhuma rota disponível para este período/),
    ).toBeInTheDocument()
  })

  it('explains an unknown airport', async () => {
    mockApi({ body: { detail: 'Airport XXX not found' }, status: 404 })
    render(<Home />)

    await search('XXX')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Aeroporto não encontrado',
    )
  })

  it('rejects the same airport twice without calling the API', async () => {
    const fetch = mockApi()
    render(<Home />)

    await search('GRU', 'gru')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Origem e destino devem ser aeroportos diferentes.',
    )
    expect(fetch).not.toHaveBeenCalledWith('/api/routes', expect.anything())
  })
})
