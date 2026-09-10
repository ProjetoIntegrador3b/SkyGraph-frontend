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
      screen.getByRole('button', { name: 'Buscar melhores rotas' }),
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

  it('displays the best routes returned by the API', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    const response = {
      price: { price: 450, connections: 2, duration: '8h 20min' },
      connections: { price: 620, connections: 1, duration: '9h 10min' },
      time: { price: 900, connections: 2, duration: '6h 45min' },
      absolute: { price: 500, connections: 1, duration: '7h 30min' },
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 }),
    )

    render(<Home />)

    await userEvent.type(screen.getByLabelText('Origem'), 'GRU')
    await userEvent.type(screen.getByLabelText('Destino'), 'JFK')
    await userEvent.click(screen.getByLabelText('Ida'))
    await userEvent.click(screen.getAllByRole('button', { name: /15 de/ })[0])
    await userEvent.click(screen.getAllByRole('button', { name: /20 de/ })[0])
    await userEvent.click(
      screen.getByRole('button', { name: 'Buscar melhores rotas' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Melhor preço' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Menos conexões' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Menor tempo' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Melhor rota absoluta' }),
    ).toBeInTheDocument()
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
