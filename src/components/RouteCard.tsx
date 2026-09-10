import type { RouteCriterion, RouteResult } from '../types/route'

interface RouteCardProps {
  criterion: RouteCriterion
  route: RouteResult | null
}

const criterionLabels: Record<RouteCriterion, string> = {
  price: 'Melhor preço',
  connections: 'Menos conexões',
  time: 'Menor tempo',
  absolute: 'Melhor rota absoluta',
}

export default function RouteCard({ criterion, route }: RouteCardProps) {
  return (
    <article className="route-card">
      <div className="route-card__heading">
        <span className="route-card__criterion">Por peso</span>
        <h3>{criterionLabels[criterion]}</h3>
      </div>

      {route ? (
        <dl className="route-card__details">
          <div>
            <dt>Preço</dt>
            <dd>
              {route.price.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </dd>
          </div>
          <div>
            <dt>Conexões</dt>
            <dd>{route.connections}</dd>
          </div>
          <div>
            <dt>Tempo total</dt>
            <dd>{route.duration}</dd>
          </div>
        </dl>
      ) : (
        <p className="route-card__empty">
          Nenhuma rota disponível para este critério.
        </p>
      )}
    </article>
  )
}
