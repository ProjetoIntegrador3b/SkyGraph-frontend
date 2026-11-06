import { formatDay } from './dates'

// How routes read on the page, shared by the best route and the full list.

export const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatPeriod(departure: string, arrival: string) {
  return departure === arrival
    ? formatDay(departure)
    : `${formatDay(departure)} → ${formatDay(arrival)}`
}

export function connectionsLabel(connections: number) {
  if (connections === 0) return 'Voo direto'
  return connections === 1 ? '1 conexão' : `${connections} conexões`
}
