import type { Airport } from '../types/airport'
import type { RouteResult } from '../types/route'
import { formatDay } from '../utils/dates'
import { PlaneIcon } from './icons'

interface RouteCardProps {
  route: RouteResult | null
  airports: Airport[]
}

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatPeriod(departure: string, arrival: string) {
  return departure === arrival
    ? formatDay(departure)
    : `${formatDay(departure)} → ${formatDay(arrival)}`
}

function connectionsLabel(connections: number) {
  if (connections === 0) return 'Voo direto'
  return connections === 1 ? '1 conexão' : `${connections} conexões`
}

// The result as a boarding pass: the two ends, the stops between them, the
// totals, and one line per leg.
export default function RouteCard({ route, airports }: RouteCardProps) {
  const cities = new Map(
    airports.map((airport) => [airport.code, airport.city]),
  )
  const place = (code: string) =>
    cities.has(code) ? `${code} · ${cities.get(code)}` : code

  if (!route) {
    return (
      <article className="route-card route-card--empty">
        <div className="route-card__top">
          <span className="route-card__label">Por preço</span>
          <h3>Melhor rota</h3>
        </div>
        <div className="route-card__empty-art" aria-hidden="true">
          <span />
          <PlaneIcon />
          <span />
        </div>
        <p className="route-card__empty">
          Nenhuma rota disponível para este período. Tente ampliar as datas.
        </p>
      </article>
    )
  }

  const from = route.legs[0].origin
  const to = route.legs[route.legs.length - 1].destination
  const stops = route.legs.slice(1).map((leg) => leg.origin)

  return (
    <article className="route-card">
      <div className="route-card__top">
        <span className="route-card__label">Por preço</span>
        <h3>Melhor rota</h3>
      </div>

      <div className="journey" aria-hidden="true">
        <div className="journey__end">
          <span className="journey__code">{from}</span>
          <span className="journey__city">{cities.get(from) ?? ''}</span>
        </div>
        <div className="journey__path">
          <span className="journey__line" />
          <PlaneIcon className="journey__plane" />
          <span className="journey__line" />
        </div>
        <div className="journey__end journey__end--to">
          <span className="journey__code">{to}</span>
          <span className="journey__city">{cities.get(to) ?? ''}</span>
        </div>
        {/* A row of its own that wraps: routes have any number of stops. */}
        {stops.length > 0 && (
          <div className="journey__stops">
            <span className="journey__via">via</span>
            {stops.map((code) => (
              <span className="journey__stop" key={code}>
                {code}
              </span>
            ))}
          </div>
        )}
      </div>

      <dl className="route-card__details">
        <div className="route-card__total">
          <dt>Preço total</dt>
          <dd>{priceFormatter.format(route.price)}</dd>
        </div>
        <div>
          <dt>Conexões</dt>
          <dd>{connectionsLabel(route.connections)}</dd>
        </div>
        <div>
          <dt>Período</dt>
          <dd>{formatPeriod(route.departureDate, route.arrivalDate)}</dd>
        </div>
      </dl>

      <div className="route-card__perforation" aria-hidden="true" />

      <ol className="route-legs" aria-label="Trechos da rota">
        {route.legs.map((leg) => (
          <li className="route-leg" key={leg.uuid}>
            <span className="route-leg__airports">
              {place(leg.origin)} → {place(leg.destination)}
            </span>
            <span className="route-leg__date">
              {formatPeriod(leg.departureDate, leg.arrivalDate)}
            </span>
            <span className="route-leg__price">
              {priceFormatter.format(leg.price)}
            </span>
          </li>
        ))}
      </ol>
    </article>
  )
}
