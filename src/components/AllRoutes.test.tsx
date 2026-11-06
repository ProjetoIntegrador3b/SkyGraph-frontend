import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { airports, allRoutesResponse } from '../test/api'
import type { RouteResult } from '../types/route'
import AllRoutes, { PAGE_SIZE } from './AllRoutes'

const search = { origin: 'GRU', destination: 'JFK' }

function answer(body: unknown, status = 200) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

// `count` direct flights, R$ 1.000 and up.
function manyRoutes(count: number) {
  const routes: RouteResult[] = Array.from({ length: count }, (_, index) => ({
    price: 1000 + index,
    connections: 0,
    departureDate: '2027-01-10',
    arrivalDate: '2027-01-10',
    legs: [
      {
        uuid: `many-${index}`,
        price: 1000 + index,
        origin: 'GRU',
        destination: 'JFK',
        departureDate: '2027-01-10',
        arrivalDate: '2027-01-10',
      },
    ],
  }))
  return { routes, truncated: false }
}

const routesList = () => screen.getByRole('list', { name: 'Rotas possíveis' })

describe('AllRoutes', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    vi.stubEnv('VITE_SAMPLE_FALLBACK', 'true')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('opens every route of the search, cheapest first', async () => {
    const fetch = answer(allRoutesResponse)
    const user = userEvent.setup()
    render(<AllRoutes search={search} airports={airports} />)

    const toggle = screen.getByRole('button', { name: /Ver todas as rotas/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(fetch).not.toHaveBeenCalled()

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(
      await screen.findByText(
        '2 rotas de GRU para JFK, da mais barata à mais cara.',
      ),
    ).toBeInTheDocument()
    const rows = [...routesList().children]
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('GRU → FOR → JFK')
    expect(rows[0]).toHaveTextContent('Mais barata')
    expect(rows[0]).toHaveTextContent(/984,95/)
    expect(rows[1]).toHaveTextContent('GRU → JFK')
    expect(rows[1]).toHaveTextContent('Voo direto')
    expect(rows[1]).not.toHaveTextContent('Mais barata')
    expect(fetch).toHaveBeenCalledWith(
      '/api/routes/all',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(search),
      }),
    )
  })

  it('shows the legs of a route when it is opened', async () => {
    answer(allRoutesResponse)
    const user = userEvent.setup()
    render(<AllRoutes search={search} airports={airports} />)
    await user.click(screen.getByRole('button', { name: /Ver todas as rotas/ }))

    await user.click(await screen.findByText('GRU → FOR → JFK'))

    const legs = screen.getByRole('list', { name: 'Trechos da rota 1' })
    expect(within(legs).getAllByRole('listitem')).toHaveLength(2)
    expect(legs).toHaveTextContent('GRU · São Paulo → FOR · Fortaleza')
  })

  it('shows the routes a page at a time', async () => {
    answer(manyRoutes(25))
    const user = userEvent.setup()
    render(<AllRoutes search={search} airports={airports} />)
    await user.click(screen.getByRole('button', { name: /Ver todas as rotas/ }))

    const rows = () => routesList().children
    await screen.findByRole('list', { name: 'Rotas possíveis' })
    expect(rows()).toHaveLength(PAGE_SIZE)

    await user.click(screen.getByRole('button', { name: /Mostrar mais 10/ }))
    expect(rows()).toHaveLength(20)
    expect(
      screen.getByRole('button', { name: /Mostrar mais 5\s*5 restantes/ }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Mostrar mais 5/ }))
    expect(rows()).toHaveLength(25)
    expect(
      screen.queryByRole('button', { name: /Mostrar mais/ }),
    ).not.toBeInTheDocument()
  })

  it('hides the list and opens it again without asking twice', async () => {
    const fetch = answer(allRoutesResponse)
    const user = userEvent.setup()
    render(<AllRoutes search={search} airports={airports} />)

    await user.click(screen.getByRole('button', { name: /Ver todas as rotas/ }))
    await screen.findByRole('list', { name: 'Rotas possíveis' })
    await user.click(screen.getByRole('button', { name: /Ocultar as rotas/ }))
    expect(
      screen.queryByRole('list', { name: 'Rotas possíveis' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Ver todas as rotas/ }))
    expect(routesList().children).toHaveLength(2)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('offers to try again after an error', async () => {
    const fetch = answer({ detail: 'Airport GRU not found' }, 404)
    const user = userEvent.setup()
    render(<AllRoutes search={search} airports={airports} />)

    await user.click(screen.getByRole('button', { name: /Ver todas as rotas/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Aeroporto não encontrado',
    )

    fetch.mockResolvedValue(new Response(JSON.stringify(allRoutesResponse)))
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(
      await screen.findByRole('list', { name: 'Rotas possíveis' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('says so when the list was cut at the limit', async () => {
    answer({ ...allRoutesResponse, truncated: true })
    const user = userEvent.setup()
    render(<AllRoutes search={search} airports={airports} />)

    await user.click(screen.getByRole('button', { name: /Ver todas as rotas/ }))

    expect(
      await screen.findByText(/\(a busca parou neste limite\)/),
    ).toBeInTheDocument()
  })
})
