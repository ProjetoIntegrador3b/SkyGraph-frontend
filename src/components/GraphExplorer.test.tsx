import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import network from '../data/sample-network.json'
import type { Flight } from '../types/route'
import { cheapestRoute, traceCheapestRoute } from '../utils/cheapestRoute'
import GraphExplorer from './GraphExplorer'

const search = { origin: 'POA', destination: 'LHR' }
const route = cheapestRoute(network.flights as Flight[], search)

describe('GraphExplorer', () => {
  beforeEach(() => {
    // jsdom has no canvas; the explorer draws nothing but still works.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    // No backend: the explorer reruns the search in the browser.
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  async function open(apiRoute = route, onClose = vi.fn()) {
    render(
      <GraphExplorer
        search={search}
        airports={[]}
        apiRoute={apiRoute}
        onClose={onClose}
      />,
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
      screen.getByText(/R\$\s4\.840,35 é o menor preço/),
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
    expect(
      screen.getByText('Refeito no navegador com os dados de exemplo'),
    ).toBeInTheDocument()
  })

  it('shows the steps the backend took when it can', async () => {
    const { trace } = traceCheapestRoute(network.flights as Flight[], search)
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          route,
          trace: {
            ...trace,
            steps: trace.steps.map((step) => ({
              ...step,
              relaxed: step.relaxed.map((edge) => ({
                ...edge,
                flight: edge.flight?.uuid ?? null,
              })),
            })),
          },
        }),
      ),
    )

    await open()

    expect(
      screen.getByText('✓ Passos calculados pelo servidor'),
    ).toBeInTheDocument()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/routes/trace',
      expect.objectContaining({ method: 'POST' }),
    )
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

  // A button that disables itself when clicked ("Ir para o resultado" at the
  // end) drops the focus to the page, and so does clicking the canvas, so the
  // browser sends the keys to <body>. jsdom keeps the focus on a disabled
  // button, so the test sends them to <body> itself.
  it('keeps the keyboard controls when the focus leaves the dialog', async () => {
    const user = userEvent.setup()
    const onClose = await open()

    await user.click(
      screen.getByRole('button', { name: 'Ir para o resultado' }),
    )
    const counter = screen.getByText(/^\d+\/\d+$/)
    const [, total] = counter.textContent!.split('/')

    fireEvent.keyDown(document.body, { key: 'ArrowLeft' })
    expect(counter).toHaveTextContent(`${Number(total) - 1}/${total}`)

    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('offers slower speeds for following each step', async () => {
    const user = userEvent.setup()
    await open()

    const speeds = screen.getByRole('group', { name: 'Velocidade' })
    expect(
      within(speeds)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['0,1×', '0,25×', '0,5×', '1×', '2×', '4×'])

    await user.click(within(speeds).getByRole('button', { name: '0,1×' }))

    expect(
      within(speeds).getByRole('button', { name: '0,1×' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('zooms the map with its buttons, the wheel and the keyboard', async () => {
    const user = userEvent.setup()
    await open()

    // Only the map zooms.
    expect(
      screen.queryByRole('group', { name: 'Zoom do mapa' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mapa' }))

    const zoomIn = screen.getByRole('button', { name: 'Aproximar o mapa' })
    const zoomOut = screen.getByRole('button', { name: 'Afastar o mapa' })
    const fit = screen.getByRole('button', { name: 'Mostrar o mapa inteiro' })
    // The whole map shows at first: nothing to zoom out to.
    expect(zoomOut).toBeDisabled()
    expect(fit).toBeDisabled()

    await user.click(zoomIn)
    expect(zoomOut).toBeEnabled()
    await user.click(fit)
    expect(zoomOut).toBeDisabled()

    fireEvent.wheel(screen.getByRole('img'), { deltaY: -300 })
    expect(zoomOut).toBeEnabled()
    fireEvent.keyDown(document.body, { key: '0' })
    expect(zoomOut).toBeDisabled()
    fireEvent.keyDown(document.body, { key: '+' })
    expect(zoomOut).toBeEnabled()

    // Up to 8×.
    for (let press = 0; press < 6; press += 1) {
      fireEvent.keyDown(document.body, { key: '+' })
    }
    expect(zoomIn).toBeDisabled()
  })

  it('brings Tab back into the dialog when the focus left it', async () => {
    const user = userEvent.setup()
    // The page behind the modal has controls of its own, first in the
    // document, where Tab from the page would otherwise go.
    render(<button type="button">Modo claro</button>)
    await open()

    ;(document.activeElement as HTMLElement).blur()
    await user.tab()

    expect(screen.getByRole('dialog')).toContainElement(
      document.activeElement as HTMLElement,
    )
  })
})
