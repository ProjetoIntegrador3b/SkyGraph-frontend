import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach } from 'vitest'
import Home from './Home'

describe('Home', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the route search form', () => {
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
    const user = userEvent.setup()
    render(<Home />)

    await user.click(screen.getByRole('button', { name: 'Ativar modo claro' }))

    expect(
      screen.getByRole('button', { name: 'Ativar modo noturno' }),
    ).toBeInTheDocument()
    expect(localStorage.getItem('skygraph-theme')).toBe('light')
  })

  it('displays the cheapest route returned by the API', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    const response = {
      route: { price: 450, connections: 2, duration: '8h 20min' },
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 }),
    )

    render(<Home />)

    await userEvent.type(screen.getByLabelText('Origem'), 'GRU')
    await userEvent.type(screen.getByLabelText('Destino'), 'JFK')
    await userEvent.click(screen.getByLabelText('Ida'))
    // Page forward one month so the days picked below are always in the
    // future -- days before today are disabled and would not register.
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }))
    await userEvent.click(screen.getAllByRole('button', { name: /15 de/ })[0])
    await userEvent.click(screen.getAllByRole('button', { name: /20 de/ })[0])
    await userEvent.click(
      screen.getByRole('button', { name: 'Buscar melhor rota' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Melhor rota' }),
    ).toBeInTheDocument()
    expect(screen.getByText('8h 20min')).toBeInTheDocument()

    // Price is the only weight: no per-criterion cards are rendered.
    expect(
      screen.queryByRole('heading', { name: 'Menos conexões' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Menor tempo' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Melhor rota absoluta' }),
    ).not.toBeInTheDocument()

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
})
