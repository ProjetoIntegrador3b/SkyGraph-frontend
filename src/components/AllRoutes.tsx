import { useId, useRef, useState } from 'react'
import { fetchAllRoutes } from '../services/routes'
import type { Airport } from '../types/airport'
import type { RouteListResponse, RouteSearchRequest } from '../types/route'
import {
  connectionsLabel,
  formatPeriod,
  priceFormatter,
} from '../utils/routeText'
import { AlertIcon, ChevronIcon } from './icons'

interface AllRoutesProps {
  search: RouteSearchRequest
  airports: Airport[]
}

// Routes shown at first, and added by each "show more".
export const PAGE_SIZE = 10

const countFormatter = new Intl.NumberFormat('pt-BR')

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; list: RouteListResponse }

// Below the best route: a button that opens every route of the same search,
// cheapest first. The list loads on the first open only, and shows a page of
// routes at a time; each route opens to show its legs.
export default function AllRoutes({ search, airports }: AllRoutesProps) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State>({ status: 'idle' })
  const [shown, setShown] = useState(PAGE_SIZE)
  const panelId = useId()
  // Ignores an answer that arrives after a newer request.
  const requestId = useRef(0)

  const cities = new Map(
    airports.map((airport) => [airport.code, airport.city]),
  )
  const place = (code: string) =>
    cities.has(code) ? `${code} · ${cities.get(code)}` : code

  async function load() {
    const id = ++requestId.current
    setState({ status: 'loading' })
    try {
      const list = await fetchAllRoutes(search)
      if (id === requestId.current) setState({ status: 'done', list })
    } catch (error) {
      if (id === requestId.current) {
        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Não foi possível buscar as rotas.',
        })
      }
    }
  }

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && state.status !== 'done' && state.status !== 'loading') {
      void load()
    }
  }

  return (
    <div className="all-routes">
      <button
        className="all-routes__toggle"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        {open ? 'Ocultar as rotas' : 'Ver todas as rotas'}
        <ChevronIcon className="all-routes__chevron" direction="right" />
      </button>

      {open && (
        <section
          className="all-routes__panel"
          id={panelId}
          aria-labelledby={`${panelId}-title`}
          aria-busy={state.status === 'loading'}
        >
          <div className="all-routes__heading">
            <h3 id={`${panelId}-title`}>Todas as rotas</h3>
            {state.status === 'done' && (
              <p className="all-routes__summary">
                {summary(state.list, search)}
              </p>
            )}
          </div>

          {state.status === 'loading' && (
            <p className="all-routes__status">Buscando todas as rotas…</p>
          )}

          {state.status === 'error' && (
            <div className="feedback feedback--error" role="alert">
              <AlertIcon className="feedback__icon" />
              <span>{state.message}</span>
              <button
                className="all-routes__retry"
                type="button"
                onClick={() => void load()}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {state.status === 'done' && state.list.routes.length > 0 && (
            <>
              <ol className="all-routes__list" aria-label="Rotas possíveis">
                {state.list.routes.slice(0, shown).map((route, index) => {
                  const codes = [
                    route.legs[0].origin,
                    ...route.legs.map((leg) => leg.destination),
                  ]
                  return (
                    <li
                      className="all-routes__item"
                      key={route.legs.map((leg) => leg.uuid).join()}
                    >
                      <details className="all-routes__route">
                        <summary>
                          <span className="all-routes__rank">{index + 1}</span>
                          <span className="all-routes__main">
                            <span className="all-routes__path">
                              {codes.join(' → ')}
                            </span>
                            <span className="all-routes__meta">
                              {connectionsLabel(route.connections)} ·{' '}
                              {formatPeriod(
                                route.departureDate,
                                route.arrivalDate,
                              )}
                            </span>
                          </span>
                          {index === 0 && (
                            <span className="all-routes__badge">
                              Mais barata
                            </span>
                          )}
                          <span className="all-routes__price">
                            {priceFormatter.format(route.price)}
                          </span>
                        </summary>
                        <ol
                          className="route-legs all-routes__legs"
                          aria-label={`Trechos da rota ${index + 1}`}
                        >
                          {route.legs.map((leg) => (
                            <li className="route-leg" key={leg.uuid}>
                              <span className="route-leg__airports">
                                {place(leg.origin)} → {place(leg.destination)}
                              </span>
                              <span className="route-leg__date">
                                {formatPeriod(
                                  leg.departureDate,
                                  leg.arrivalDate,
                                )}
                              </span>
                              <span className="route-leg__price">
                                {priceFormatter.format(leg.price)}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </details>
                    </li>
                  )
                })}
              </ol>

              {shown < state.list.routes.length && (
                <button
                  className="all-routes__more"
                  type="button"
                  onClick={() => setShown((count) => count + PAGE_SIZE)}
                >
                  Mostrar mais{' '}
                  {Math.min(PAGE_SIZE, state.list.routes.length - shown)}
                  <span className="all-routes__left">
                    {countFormatter.format(state.list.routes.length - shown)}{' '}
                    restantes
                  </span>
                </button>
              )}
            </>
          )}

          {state.status === 'done' && state.list.routes.length === 0 && (
            <p className="all-routes__status">
              Nenhuma rota disponível para este período.
            </p>
          )}
        </section>
      )}
    </div>
  )
}

function summary(list: RouteListResponse, search: RouteSearchRequest) {
  const count = list.routes.length
  const routes =
    count === 1 ? '1 rota' : `${countFormatter.format(count)} rotas`
  const order = count > 1 ? ', da mais barata à mais cara' : ''
  const cut = list.truncated ? ' (a busca parou neste limite)' : ''
  return `${routes} de ${search.origin} para ${search.destination}${order}${cut}.`
}
