import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import network from '../data/sample-network.json'
import type { Flight } from '../types/route'
import { cheapestRoute } from '../utils/cheapestRoute'
import GraphExplorer from './GraphExplorer'

const search = { origin: 'POA', destination: 'LHR' }
const route = cheapestRoute(network.flights as Flight[], search)

describe('GraphExplorer', () => {
  beforeEach(() => {
    // jsdom has no canvas; the explorer draws nothing but still works.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function open(apiRoute = route, onClose = vi.fn()) {
    render(
      <GraphExplorer search={search} apiRoute={apiRoute} onClose={onClose} />,
    )
    // Loaded once the replay controls are enabled.
    await screen.findByRole('button', { name: 'Ir para o resultado' })
    await vi.waitFor(() =>
      expect(
        screen.getByRole('slider', { name: 'Passo da busca' }),
      ).toBeEnabled(),
    )
    return onClose
  }

  it('opens as a dialog about the search', async () => {
    await open()

    expect(
      screen.getByRole('dialog', {
        name: 'Dijkstra no grafo de voos · POA → LHR',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Fechar visualização' }),
    ).toHaveFocus()
  })

  it('steps through the search and ends on the cheapest route', async () => {
    const user = userEvent.setup()
    await open()

    await user.click(screen.getByRole('button', { name: 'Voltar ao início' }))
    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Próximo passo' }))
    expect(
      screen.getByRole('heading', { name: /^Passo 1 de \d+$/ }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Retira POA ·/)).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Ir para o resultado' }),
    )
    expect(
      screen.getByRole('heading', { name: 'Destino alcançado' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/R\$\s3\.907,18 é o menor preço/),
    ).toBeInTheDocument()
  })

  it('shows the priority queue and the counts', async () => {
    const user = userEvent.setup()
    await open()

    await user.click(screen.getByRole('button', { name: 'Voltar ao início' }))

    const queue = screen.getByRole('heading', {
      name: 'Fila de prioridade',
    }).parentElement!
    expect(within(queue).getAllByRole('listitem')).toHaveLength(1)
    expect(within(queue).getByText(/^POA ·/)).toBeInTheDocument()
    expect(screen.getByText('Nós no grafo').nextSibling).toHaveTextContent(
      '753',
    )
  })

  it('confirms the replay matches the API', async () => {
    await open()

    expect(
      screen.getByText('✓ Mesmo resultado da busca na API'),
    ).toBeInTheDocument()
  })

  it('says so when the API answered differently', async () => {
    await open(null)

    expect(
      screen.getByText('Os dados do servidor diferem do snapshot usado aqui'),
    ).toBeInTheDocument()
  })

  it('switches between the time graph and the map', async () => {
    const user = userEvent.setup()
    await open()

    await user.click(screen.getByRole('button', { name: 'Mapa' }))

    expect(screen.getByRole('button', { name: 'Mapa' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Mapa dos aeroportos alcançados pela busca',
    )
  })

  it('closes with Escape', async () => {
    const user = userEvent.setup()
    const onClose = await open()

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })
})
