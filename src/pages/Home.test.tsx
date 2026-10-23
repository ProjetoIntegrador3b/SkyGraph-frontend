import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, vi } from 'vitest'
import { mockApi } from '../test/api'
import Home from './Home'

type Dates = { departure?: number; return?: number }

// Fills the airports, picks the given days of next month (always in the
// future; past days are disabled), and submits.
async function search(
  origin = 'GRU',
  destination = 'JFK',
  dates: Dates = { departure: 15, return: 20 },
) {
  await userEvent.type(screen.getByLabelText('Origem'), origin)
  await userEvent.type(screen.getByLabelText('Destino'), destination)
  let paged = false
  for (const [label, day] of [
    ['Ida', dates.departure],
    ['Volta', dates.return],
  ] as const) {
    if (day === undefined) continue
    await userEvent.click(screen.getByLabelText(label))
    // Each pick closes the calendar; it reopens on the same month.
    if (!paged) {
      await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }))
      paged = true
    }
    await userEvent.click(
      screen.getAllByRole('button', { name: new RegExp(`\\b${day} de`) })[0],
    )
  }
  await userEvent.click(
    screen.getByRole('button', { name: 'Buscar melhor rota' }),
  )
}

// The JSON body of the route search request.
function sentSearch(fetch: ReturnType<typeof mockApi>) {
  const call = fetch.mock.calls.find(([url]) => url === '/api/routes')
  return JSON.parse(String(call?.[1]?.body))
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

  it('searches without dates, sending only the airports', async () => {
    const fetch = mockApi()
    render(<Home />)

    await search('GRU', 'JFK', {})

    await screen.findByRole('list', { name: 'Trechos da rota' })
    expect(sentSearch(fetch)).toEqual({ origin: 'GRU', destination: 'JFK' })
  })

  it('searches from a departure date with no arrival limit', async () => {
    const fetch = mockApi()
    render(<Home />)

    await search('GRU', 'JFK', { departure: 15 })

    await screen.findByRole('list', { name: 'Trechos da rota' })
    const body = sentSearch(fetch)
    expect(body.departureDate).toMatch(/^\d{4}-\d{2}-15$/)
    expect(body).not.toHaveProperty('returnDate')
  })

  it('searches up to an arrival date with no departure limit', async () => {
    const fetch = mockApi()
    render(<Home />)

    await search('GRU', 'JFK', { return: 20 })

    await screen.findByRole('list', { name: 'Trechos da rota' })
    const body = sentSearch(fetch)
    expect(body.returnDate).toMatch(/^\d{4}-\d{2}-20$/)
    expect(body).not.toHaveProperty('departureDate')
  })

  it('describes the period for any combination of dates', async () => {
    mockApi()
    render(<Home />)

    expect(screen.getByText(/Sem datas/)).toBeInTheDocument()
    expect(screen.getByLabelText('Ida')).toHaveTextContent('Qualquer data')

    await userEvent.click(screen.getByLabelText('Ida'))
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }))
    await userEvent.click(screen.getAllByRole('button', { name: /\b15 de/ })[0])
    expect(screen.getByText(/^Voos a partir de 15/)).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Volta'))
    await userEvent.click(screen.getAllByRole('button', { name: /\b20 de/ })[0])
    expect(screen.getByText(/^Voos entre 15 .* e 20 /)).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Ida'))
    await userEvent.click(screen.getByRole('button', { name: 'Limpar data' }))
    expect(screen.getByText(/^Voos com chegada até 20/)).toBeInTheDocument()
  })
})
