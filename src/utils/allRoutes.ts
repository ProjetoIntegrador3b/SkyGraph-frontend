import type {
  Flight,
  RouteListResponse,
  RouteSearchRequest,
} from '../types/route'
import { flightsInPeriod, toRoute } from './cheapestRoute'

// Every route of a search, by the same rules and in the same order as the
// backend (app/services/all_routes.py), for the sample data:
// - each flight departs on or after the day the previous one lands;
// - a route never passes through the same airport twice (a loop back is
//   always pricier than waiting there for free, so the cheapest route is in
//   the list, first);
// - cheapest first; ties go to fewer flights, then the earliest arrival,
//   then the earliest departure.
// A depth-first search from the origin, stopped at `limit` routes.
export const MAX_ROUTES = 5000

export function allRoutes(
  flights: Flight[],
  search: RouteSearchRequest,
  limit = MAX_ROUTES,
): RouteListResponse {
  const departures = new Map<string, Flight[]>()
  for (const flight of flightsInPeriod(flights, search)) {
    const list = departures.get(flight.origin) ?? []
    list.push(flight)
    departures.set(flight.origin, list)
  }

  const found: Flight[][] = []
  const legs: Flight[] = []
  const visited = new Set([search.origin])
  let truncated = false

  const visit = (airport: string, ready: string | null) => {
    for (const flight of departures.get(airport) ?? []) {
      if (truncated) return
      if (ready !== null && flight.departureDate < ready) continue
      if (visited.has(flight.destination)) continue
      legs.push(flight)
      if (flight.destination === search.destination) {
        if (found.length === limit) truncated = true
        else found.push([...legs])
      } else {
        visited.add(flight.destination)
        visit(flight.destination, flight.arrivalDate)
        visited.delete(flight.destination)
      }
      legs.pop()
    }
  }
  visit(search.origin, null)

  const routes = found.map(toRoute)
  routes.sort(
    (a, b) =>
      Math.round(a.price * 100) - Math.round(b.price * 100) ||
      a.legs.length - b.legs.length ||
      a.arrivalDate.localeCompare(b.arrivalDate) ||
      a.departureDate.localeCompare(b.departureDate),
  )
  return { routes, truncated }
}
