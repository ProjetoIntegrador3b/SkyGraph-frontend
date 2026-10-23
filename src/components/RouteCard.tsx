import type { Airport } from '../types/airport'
import type { RouteResult } from '../types/route'
import { formatDay } from '../utils/dates'

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

export default function RouteCard({ route, airports }: RouteCardProps) {
  const cities = new Map(
    airports.map((airport) => [airport.code, airport.city]),
  )
  const place = (code: string) =>
    cities.has(code) ? `${code} · ${cities.get(code)}` : code

  return (
    <article className="route-card">
      <div className="route-card__heading">
        <span className="route-card__label">Por preço</span>
        <h3>Melhor rota</h3>
      </div>

      {route ? (
        <>
          <dl className="route-card__details">
            <div>
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
        </>
      ) : (
        <p className="route-card__empty">
          Nenhuma rota disponível para este período. Tente ampliar as datas.
        </p>
      )}
    </article>
  )
}
