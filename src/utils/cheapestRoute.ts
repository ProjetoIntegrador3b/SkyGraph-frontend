import type { Flight, RouteResult, RouteSearchRequest } from '../types/route'

// Longest route considered: 4 flights, 3 connections — as in the backend.
export const MAX_FLIGHTS = 4

// The cheapest route, by the same rules as the backend's Cypher query:
// - only flights that depart on or after `departureDate` and arrive on or
//   before `returnDate` (a missing date leaves that end open);
// - each connecting flight departs on or after the day the previous lands;
// - lowest total price wins; ties go to fewer flights, then the earliest
//   arrival. Null when no route fits.
export function cheapestRoute(
  flights: Flight[],
  search: RouteSearchRequest,
): RouteResult | null {
  const usable = flights.filter(
    (flight) =>
      (!search.departureDate || flight.departureDate >= search.departureDate) &&
      (!search.returnDate || flight.arrivalDate <= search.returnDate),
  )
  const byOrigin = new Map<string, Flight[]>()
  for (const flight of usable) {
    const list = byOrigin.get(flight.origin) ?? []
    list.push(flight)
    byOrigin.set(flight.origin, list)
  }

  let best: { legs: Flight[]; price: number } | null = null
  const path: Flight[] = []
  // Prices are positive, so a route that visits an airport twice is never
  // the cheapest; skipping those keeps the search small.
  const visited = new Set([search.origin])

  function better(legs: Flight[], price: number) {
    if (!best) return true
    if (price !== best.price) return price < best.price
    if (legs.length !== best.legs.length) return legs.length < best.legs.length
    return legs[legs.length - 1].arrivalDate < best.legs.at(-1)!.arrivalDate
  }

  function walk(airport: string, price: number) {
    for (const flight of byOrigin.get(airport) ?? []) {
      const previous = path[path.length - 1]
      if (previous && flight.departureDate < previous.arrivalDate) continue
      if (visited.has(flight.destination)) continue

      const total = price + flight.price
      path.push(flight)
      if (flight.destination === search.destination) {
        if (better(path, total)) best = { legs: [...path], price: total }
      } else if (path.length < MAX_FLIGHTS) {
        visited.add(flight.destination)
        walk(flight.destination, total)
        visited.delete(flight.destination)
      }
      path.pop()
    }
  }

  walk(search.origin, 0)
  if (!best) return null

  const { legs, price } = best as { legs: Flight[]; price: number }
  return {
    price: Math.round(price * 100) / 100,
    connections: legs.length - 1,
    departureDate: legs[0].departureDate,
    arrivalDate: legs[legs.length - 1].arrivalDate,
    legs,
  }
}
