import type { RouteResult } from '../types/route'

interface RouteCardProps {
  route: RouteResult | null
}

export default function RouteCard({ route }: RouteCardProps) {
  return (
    <article className="route-card">
      <div className="route-card__heading">
        <span className="route-card__label">Por preço</span>
        <h3>Melhor rota</h3>
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
          Nenhuma rota disponível para esta busca.
        </p>
      )}
    </article>
  )
}
