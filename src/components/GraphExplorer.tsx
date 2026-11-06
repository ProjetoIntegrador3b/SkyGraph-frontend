import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { fetchRouteTrace, type RouteTrace } from '../services/routeTrace'
import type { Airport } from '../types/airport'
import type { RouteResult, RouteSearchRequest } from '../types/route'
import {
  airportOfKey,
  dayOf,
  queueOrder,
  replay,
  type DijkstraTrace,
  type TraceState,
} from '../utils/dijkstraTrace'
import {
  buildLayout,
  drawBase,
  drawFrame,
  MAX_ZOOM,
  NO_ZOOM,
  panBy,
  readPalette,
  zoomAround,
  type MapZoom,
  type View,
} from './graphCanvas'
import { ChevronIcon, CloseIcon, PauseIcon, PlayIcon, SkipIcon } from './icons'

interface GraphExplorerProps {
  search: RouteSearchRequest
  // The airport list the page loaded, to place airports on the map.
  airports: Airport[]
  // What the API answered, to check the replay against it.
  apiRoute: RouteResult | null
  onClose: () => void
}

interface Loaded {
  airports: Map<string, Airport>
  trace: DijkstraTrace
  route: RouteResult | null
  source: RouteTrace['source']
}

// 0.1× lets a long search be followed step by step: about 3 steps a second
// on POA → LHR (441 steps), one every 3 s or so on a short one.
const SPEEDS = [0.1, 0.25, 0.5, 1, 2, 4]
// How much one press of + or − zooms the map.
const ZOOM_STEP = 1.6
const MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})
const price = (cents: number) => money.format(cents / 100)

function formatDay(day: string) {
  const [year, month, date] = day.split('-')
  return `${Number(date)} ${MONTHS[Number(month) - 1]} ${year}`
}

const nodeName = (key: string) =>
  `${airportOfKey(key)} · ${formatDay(dayOf(key))}`

const flightsLabel = (count: number) =>
  count === 1 ? '1 voo' : `${count} voos`

const reducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Steps per second at 1×: long searches play in about 14 seconds.
const baseRate = (steps: number) => Math.min(40, Math.max(3, steps / 14))

// A modal that replays the cheapest-route search step by step, on the
// time-expanded graph or on the map. The steps come from the backend
// (POST /api/routes/trace), or from the same Dijkstra rerun in the browser
// on the sample data when the backend can't give them.
export default function GraphExplorer({
  search,
  airports,
  apiRoute,
  onClose,
}: GraphExplorerProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [failed, setFailed] = useState(false)
  const [view, setView] = useState<View>('time')
  const [step, setStep] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [hover, setHover] = useState<{
    id: string
    x: number
    y: number
  } | null>(null)

  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  // Get the search step by step, from the backend or rerun here. The
  // airport list is read once: a later update must not restart the replay.
  const [initialAirports] = useState(airports)
  useEffect(() => {
    let active = true
    fetchRouteTrace(search, initialAirports)
      .then(({ route, trace, airports: placed, source }) => {
        if (!active) return
        setLoaded({
          airports: new Map(placed.map((a) => [a.code, a])),
          trace,
          route,
          source,
        })
        if (reducedMotion()) {
          setStep(trace.steps.length - 1)
        } else {
          setStep(-1)
          setPlaying(trace.steps.length > 0)
        }
      })
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
  }, [search, initialAirports])

  // Modal behaviour: focus inside, page behind does not scroll, focus goes
  // back to the button that opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      opener?.focus?.()
    }
  }, [])

  const total = loaded?.trace.steps.length ?? 0
  const last = total - 1
  const state = useMemo(
    () => (loaded ? replay(loaded.trace, step) : null),
    [loaded, step],
  )

  // Playback: advance at the chosen speed, stop at the end.
  useEffect(() => {
    if (!playing || !loaded) return
    const rate = baseRate(total) * speed
    let frame = 0
    let previous = performance.now()
    let carry = 0
    const tick = (now: number) => {
      carry += ((now - previous) / 1000) * rate
      previous = now
      const advance = Math.floor(carry)
      if (advance > 0) {
        carry -= advance
        setStep((current) => {
          const next = Math.min(last, current + advance)
          if (next >= last) setPlaying(false)
          return next
        })
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, speed, loaded, total, last])

  // The canvas follows its box.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width: Math.floor(width), height: Math.floor(height) })
    })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  // The map's zoom. Kept when switching to the time graph and back.
  const [zoom, setZoom] = useState<MapZoom>(NO_ZOOM)

  // Where everything goes, recomputed when the size, the view or the map's
  // zoom changes.
  const layout = useMemo(() => {
    if (!loaded || size.width < 10 || size.height < 10) return null
    return buildLayout(
      view,
      loaded.trace,
      [...loaded.airports.values()],
      size.width,
      size.height,
      zoom,
    )
  }, [loaded, size, view, zoom])

  // Zooms the map by `factor` around a point of the stage, by default its
  // centre.
  function zoomMap(factor: number, x = size.width / 2, y = size.height / 2) {
    setZoom((current) =>
      zoomAround(current, factor, x, y, size.width, size.height),
    )
  }

  // The wheel (and a trackpad pinch, which the browser sends as a wheel)
  // zooms around the pointer. A native listener, because React's is passive
  // and could not stop the page from scrolling.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || view !== 'map') return
    const listener = (event: WheelEvent) => {
      event.preventDefault()
      const lines = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1
      const box = canvas.getBoundingClientRect()
      const factor = Math.exp((-event.deltaY * lines) / 500)
      const { width, height } = box
      // The nodes move under the pointer; the next move finds the new one.
      setHover(null)
      setZoom((current) =>
        zoomAround(
          current,
          factor,
          event.clientX - box.left,
          event.clientY - box.top,
          width,
          height,
        ),
      )
    }
    canvas.addEventListener('wheel', listener, { passive: false })
    return () => canvas.removeEventListener('wheel', listener)
  }, [view, loaded])

  // Dragging moves a zoomed-in map.
  const drag = useRef<{ id: number; x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const pannable = view === 'map' && zoom.scale > 1

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!pannable || event.button !== 0) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    setDragging(true)
    setHover(null)
  }

  function endDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (drag.current?.id !== event.pointerId) return
    drag.current = null
    setDragging(false)
  }

  // The draw loop reads the latest state and hover from here, so it keeps
  // running across steps instead of restarting on each one.
  const live = useRef<{
    state: TraceState | null
    hover: string | null
  }>({ state: null, hover: null })
  useEffect(() => {
    live.current = { state, hover: hover?.id ?? null }
  }, [state, hover])

  // Draw the static layer once per layout, then every frame on top of it,
  // so the current node can pulse.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !layout || !loaded) return
    const palette = readPalette(dialogRef.current ?? document.body)
    const ratio = window.devicePixelRatio || 1
    const base = document.createElement('canvas')
    base.width = canvas.width = layout.width * ratio
    base.height = canvas.height = layout.height * ratio
    const baseCtx = base.getContext('2d')
    const ctx = canvas.getContext('2d')
    if (!baseCtx || !ctx) return
    baseCtx.scale(ratio, ratio)
    drawBase(baseCtx, layout, loaded.trace, palette)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    const still = reducedMotion()
    let frame = 0
    const draw = (now: number) => {
      const { state: current, hover: hovered } = live.current
      if (current) {
        drawFrame(ctx, base, layout, loaded.trace, current, palette, {
          now: still ? 0 : now,
          hover: hovered,
        })
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [layout, loaded])

  function go(to: number) {
    setPlaying(false)
    setStep(Math.max(-1, Math.min(last, to)))
  }

  function togglePlay() {
    if (!loaded || total === 0) return
    if (!playing && step >= last) setStep(-1)
    setPlaying((current) => !current)
  }

  function handleKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement
    const typing = target.tagName === 'INPUT'
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if (event.key === 'Tab') {
      // Keep the focus inside the dialog, and bring it back when it has
      // fallen to the page behind (see the listener below).
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const end = focusable[focusable.length - 1]
      const inside = dialogRef.current!.contains(document.activeElement)
      if (event.shiftKey && (!inside || document.activeElement === first)) {
        event.preventDefault()
        end.focus()
      } else if (
        !event.shiftKey &&
        (!inside || document.activeElement === end)
      ) {
        event.preventDefault()
        first.focus()
      }
    } else if (!typing && event.key === 'ArrowRight') {
      event.preventDefault()
      go(step + 1)
    } else if (!typing && event.key === 'ArrowLeft') {
      event.preventDefault()
      go(step - 1)
    } else if (event.key === ' ' && target.tagName !== 'BUTTON' && !typing) {
      event.preventDefault()
      togglePlay()
    } else if (view === 'map' && (event.key === '+' || event.key === '=')) {
      event.preventDefault()
      zoomMap(ZOOM_STEP)
    } else if (view === 'map' && event.key === '-') {
      event.preventDefault()
      zoomMap(1 / ZOOM_STEP)
    } else if (view === 'map' && event.key === '0') {
      event.preventDefault()
      setZoom(NO_ZOOM)
    }
  }

  // The keys are heard on the whole document, not just the dialog: clicking
  // a control that then disables itself ("Ir para o resultado" at the end),
  // or the canvas, which takes no focus, drops the focus to the page, and
  // the keys would stop reaching the dialog. The listener stays put and calls
  // the latest handler, so it sees the current step.
  const keyHandler = useRef(handleKeyDown)
  useEffect(() => {
    keyHandler.current = handleKeyDown
  })
  useEffect(() => {
    const listener = (event: KeyboardEvent) => keyHandler.current(event)
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [])

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!layout) return
    const start = drag.current
    if (start?.id === event.pointerId) {
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      drag.current = { ...start, x: event.clientX, y: event.clientY }
      setZoom((current) => panBy(current, dx, dy, size.width, size.height))
      return
    }
    const box = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - box.left
    const y = event.clientY - box.top
    let nearest: { id: string; distance: number } | null = null
    for (const hit of layout.hits) {
      const distance = Math.hypot(hit.x - x, hit.y - y)
      if (distance < 14 && (!nearest || distance < nearest.distance)) {
        nearest = { id: hit.id, distance }
      }
    }
    setHover(nearest ? { id: nearest.id, x, y } : null)
  }

  const match = loaded ? sameRoute(loaded.route, apiRoute) : null

  return (
    <div
      className="graph-explorer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="graph-explorer-title"
      ref={dialogRef}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="graph-explorer__panel">
        <header className="graph-explorer__header">
          <div>
            <p className="eyebrow">Como a rota foi encontrada</p>
            <h2 id="graph-explorer-title">
              Dijkstra no grafo de voos · {search.origin} → {search.destination}
            </h2>
          </div>
          <div
            className="graph-explorer__views"
            role="group"
            aria-label="Visualização"
          >
            <button
              type="button"
              aria-pressed={view === 'time'}
              onClick={() => setView('time')}
            >
              Grafo no tempo
            </button>
            <button
              type="button"
              aria-pressed={view === 'map'}
              onClick={() => setView('map')}
            >
              Mapa
            </button>
          </div>
          <button
            ref={closeRef}
            className="graph-explorer__close"
            type="button"
            onClick={onClose}
            aria-label="Fechar visualização"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="graph-explorer__body">
          <div className="graph-explorer__stage" ref={stageRef}>
            {failed && (
              <p className="graph-explorer__status">
                Não foi possível carregar o grafo. Tente novamente em instantes.
              </p>
            )}
            {!loaded && !failed && (
              <p className="graph-explorer__status">Montando o grafo…</p>
            )}
            <canvas
              ref={canvasRef}
              className={`graph-explorer__canvas ${pannable ? 'is-pannable' : ''} ${dragging ? 'is-dragging' : ''}`}
              role="img"
              aria-label={
                view === 'time'
                  ? 'Grafo expandido no tempo: uma linha por aeroporto, os dias da esquerda para a direita'
                  : 'Mapa dos aeroportos alcançados pela busca'
              }
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerLeave={() => setHover(null)}
            />
            {view === 'map' && loaded && (
              <div
                className="graph-explorer__zoom"
                role="group"
                aria-label="Zoom do mapa"
              >
                <button
                  type="button"
                  onClick={() => zoomMap(ZOOM_STEP)}
                  disabled={zoom.scale >= MAX_ZOOM}
                  aria-label="Aproximar o mapa"
                  title="Aproximar (+ ou roda do mouse)"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => zoomMap(1 / ZOOM_STEP)}
                  disabled={zoom.scale <= 1}
                  aria-label="Afastar o mapa"
                  title="Afastar (−)"
                >
                  −
                </button>
                <button
                  type="button"
                  className="graph-explorer__zoom-fit"
                  onClick={() => setZoom(NO_ZOOM)}
                  disabled={zoom.scale <= 1}
                  aria-label="Mostrar o mapa inteiro"
                  title="Mapa inteiro (0)"
                >
                  Ajustar
                </button>
              </div>
            )}
            {hover && loaded && state && (
              <Tooltip
                id={hover.id}
                view={view}
                x={hover.x}
                y={hover.y}
                width={size.width}
                loaded={loaded}
                state={state}
              />
            )}
          </div>

          <aside className="graph-explorer__side">
            {loaded && state && (
              <>
                {match !== null && (
                  <p
                    className={`graph-explorer__match ${match ? '' : 'is-different'}`}
                  >
                    {loaded.source === 'server'
                      ? match
                        ? '✓ Passos calculados pelo servidor'
                        : 'Os voos mudaram desde a busca: estes são os passos de agora'
                      : match
                        ? '✓ Mesmo resultado da busca na API'
                        : 'Os dados do servidor diferem do snapshot usado aqui'}
                    <small>
                      {loaded.source === 'server'
                        ? 'O mesmo Dijkstra da busca, com os voos da API'
                        : 'Refeito no navegador com os dados de exemplo'}
                    </small>
                  </p>
                )}
                <Narrative
                  loaded={loaded}
                  state={state}
                  total={total}
                  playing={playing}
                />
                <Stats loaded={loaded} state={state} />
                <Queue state={state} />
                <Legend view={view} />
              </>
            )}
          </aside>
        </div>

        <footer className="graph-explorer__controls">
          <div className="graph-explorer__buttons">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={!loaded || step < 0}
              aria-label="Voltar ao início"
            >
              <SkipIcon direction="back" />
            </button>
            <button
              type="button"
              onClick={() => go(step - 1)}
              disabled={!loaded || step < 0}
              aria-label="Passo anterior"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              className="graph-explorer__play"
              onClick={togglePlay}
              disabled={!loaded || total === 0}
              aria-label={playing ? 'Pausar' : 'Reproduzir'}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              type="button"
              onClick={() => go(step + 1)}
              disabled={!loaded || step >= last}
              aria-label="Próximo passo"
            >
              <ChevronIcon direction="right" />
            </button>
            <button
              type="button"
              onClick={() => go(last)}
              disabled={!loaded || step >= last}
              aria-label="Ir para o resultado"
            >
              <SkipIcon direction="forward" />
            </button>
          </div>
          <label className="graph-explorer__scrub">
            <span className="visually-hidden">Passo da busca</span>
            <input
              type="range"
              min={-1}
              max={Math.max(last, -1)}
              value={step}
              disabled={!loaded || total === 0}
              onChange={(event) => go(Number(event.target.value))}
            />
          </label>
          <span className="graph-explorer__counter">
            {step + 1}/{total}
          </span>
          <div
            className="graph-explorer__speeds"
            role="group"
            aria-label="Velocidade"
          >
            {SPEEDS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={speed === value}
                onClick={() => setSpeed(value)}
              >
                {String(value).replace('.', ',')}×
              </button>
            ))}
          </div>
        </footer>
      </div>
    </div>
  )
}

function sameRoute(a: RouteResult | null, b: RouteResult | null) {
  const ids = (route: RouteResult | null) =>
    route ? route.legs.map((leg) => leg.uuid).join() : ''
  return ids(a) === ids(b)
}

function Narrative({
  loaded,
  state,
  total,
  playing,
}: {
  loaded: Loaded
  state: TraceState
  total: number
  playing: boolean
}) {
  const { trace } = loaded
  const current = state.current
  let title: string
  let body: string

  if (!trace.start) {
    title = 'Sem voos de partida'
    body = `${trace.origin} não tem voos no período, então a fila começa vazia e não há rota.`
  } else if (!current) {
    title = 'Início'
    body = `Só o nó de partida, ${nodeName(trace.start)}, está na fila, com custo R$ 0,00. A cada passo o Dijkstra retira da fila o nó mais barato ainda não visitado.`
  } else if (state.finished && trace.path) {
    title = 'Destino alcançado'
    body = `${nodeName(current.node)} foi o primeiro nó de ${trace.destination} a sair da fila. Como a fila sempre entrega o mais barato, ${price(current.cents)} é o menor preço possível — com ${flightsLabel(current.flights)}.`
  } else if (state.finished) {
    title = 'Fila vazia'
    body = `Todos os nós alcançáveis foram visitados e nenhum é de ${trace.destination}: não há rota no período.`
  } else {
    const flights = current.relaxed.filter((edge) => edge.flight).length
    const waits = current.relaxed.length - flights
    const better = current.relaxed.filter((edge) => edge.improved).length
    title = `Passo ${state.step + 1} de ${total}`
    body = `Retira ${nodeName(current.node)} da fila (${price(current.cents)}, ${flightsLabel(current.flights)}) e olha suas saídas: ${flights === 0 ? 'nenhum voo' : flights === 1 ? '1 voo' : `${flights} voos`}${waits ? ' e 1 espera' : ''}. ${better === 0 ? 'Nenhuma melhora o custo de um vizinho.' : `${better} ${better === 1 ? 'melhora' : 'melhoram'} o custo de um vizinho.`}`
  }

  const edges = current && !state.finished ? current.relaxed.slice(0, 4) : []

  return (
    <section
      className="graph-explorer__narrative"
      aria-live={playing ? 'off' : 'polite'}
    >
      <p className="graph-explorer__section-label">Passo atual</p>
      <h3>{title}</h3>
      <p>{body}</p>
      {/* Always there, even empty, with room for 4 edges and the "+ N
          arestas" line, so the sections below never move. */}
      <ul className="graph-explorer__edges" aria-label="Arestas do passo">
        {edges.map((edge) => (
          <li key={edge.to + (edge.flight?.uuid ?? 'wait')}>
            <span className={edge.improved ? 'is-better' : 'is-worse'}>
              {edge.improved ? '✓' : '✗'}
            </span>
            {edge.flight
              ? `${edge.flight.origin} → ${edge.flight.destination}`
              : `espera até ${formatDay(dayOf(edge.to))}`}
            <span className="graph-explorer__edge-price">
              {price(edge.cents)}
            </span>
          </li>
        ))}
        {edges.length > 0 && current!.relaxed.length > 4 && (
          <li className="graph-explorer__more">
            + {current!.relaxed.length - 4} arestas
          </li>
        )}
      </ul>
    </section>
  )
}

function Stats({ loaded, state }: { loaded: Loaded; state: TraceState }) {
  const { trace } = loaded
  const items = [
    ['Nós no grafo', trace.nodes.length],
    ['Arestas', trace.flights.length + trace.waits.length],
    ['Visitados', state.settled.size],
    ['Na fila', state.open.size],
    ['Relaxamentos', state.relaxations],
    ['Melhorias', state.improvements],
  ] as const
  return (
    <section className="graph-explorer__counts">
      <h3>Números da busca</h3>
      <dl className="graph-explorer__stats">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Queue({ state }: { state: TraceState }) {
  const queue = queueOrder(state)
  return (
    <section className="graph-explorer__queue">
      <h3>Fila de prioridade</h3>
      {/* A fixed box with room for 5 nodes and the "+ N nós" line. */}
      <div className="graph-explorer__queue-box">
        {queue.length === 0 ? (
          <p className="graph-explorer__empty">Vazia</p>
        ) : (
          <ol>
            {queue.slice(0, 5).map((key) => {
              const label = state.best.get(key)!
              return (
                <li key={key}>
                  <span>{nodeName(key)}</span>
                  <span className="graph-explorer__edge-price">
                    {price(label.cents)}
                  </span>
                </li>
              )
            })}
            {queue.length > 5 && (
              <li className="graph-explorer__more">+ {queue.length - 5} nós</li>
            )}
          </ol>
        )}
      </div>
    </section>
  )
}

function Legend({ view }: { view: View }) {
  return (
    <section className="graph-explorer__legend">
      <h3>Como ler</h3>
      <ul>
        {view === 'time' ? (
          <>
            <li>
              <span className="legend-dot" /> Nó = um aeroporto num dia
            </li>
            <li>
              <span className="legend-line legend-line--curve" /> Voo: aresta
              com o preço da passagem
            </li>
            <li>
              <span className="legend-line" /> Espera no aeroporto: aresta de R$
              0
            </li>
          </>
        ) : (
          <>
            <li>
              <span className="legend-dot" /> Aeroporto alcançado pela busca
            </li>
            <li>
              <span className="legend-line legend-line--curve" /> Voo que levou
              até ele
            </li>
          </>
        )}
        <li>
          <span className="legend-heat" /> Custo acumulado: barato → caro
        </li>
        <li>
          <span className="legend-ring" /> Na fila de prioridade
        </li>
        <li>
          <span className="legend-current" /> Nó sendo visitado
        </li>
        <li>
          <span className="legend-path" /> Rota mais barata
        </li>
      </ul>
    </section>
  )
}

function Tooltip({
  id,
  view,
  x,
  y,
  width,
  loaded,
  state,
}: {
  id: string
  view: View
  x: number
  y: number
  width: number
  loaded: Loaded
  state: TraceState
}) {
  const code = view === 'time' ? airportOfKey(id) : id
  const city = loaded.airports.get(code)?.city ?? ''
  let detail: string
  if (view === 'time') {
    const label = state.best.get(id)
    detail = state.settled.has(id)
      ? `Visitado · ${price(label!.cents)}`
      : state.open.has(id)
        ? `Na fila · ${price(label!.cents)}`
        : 'Ainda não alcançado'
  } else {
    const reached = state.reached.get(code)
    detail = reached
      ? `Alcançado no passo ${reached.step + 1} · ${price(reached.cents)}`
      : 'Ainda não alcançado'
  }
  const flip = x > width - 200
  return (
    <div
      className="graph-explorer__tooltip"
      style={{
        left: flip ? undefined : x + 14,
        right: flip ? width - x + 14 : undefined,
        top: y + 14,
      }}
    >
      <strong>
        {code} · {city}
      </strong>
      {view === 'time' && <span>{formatDay(dayOf(id))}</span>}
      <span>{detail}</span>
    </div>
  )
}
