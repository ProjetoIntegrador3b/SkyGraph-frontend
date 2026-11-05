import type { Flight, RouteResult, RouteSearchRequest } from '../types/route'

// The cheapest route, by the same rules and the same algorithm as the
// backend (app/services/dijkstra.py): Dijkstra on a time-expanded graph.
// - only flights that depart on or after `departureDate` and arrive on or
//   before `returnDate` (a missing date leaves that end open);
// - each connecting flight departs on or after the day the previous lands;
// - lowest total price wins, with any number of connections; ties go to
//   fewer flights, then the earliest arrival. Null when no route fits.
//
// A route must respect time, so plain Dijkstra over airports is not enough:
// the cheapest way into an airport may land too late for the next flight.
// The graph is expanded in time instead:
// - a node is an airport on a day when a flight departs from or lands at it;
// - a flight is an edge from (origin, departure day) to (destination,
//   arrival day), weighted by its price;
// - waiting is a free edge from (airport, day) to (same airport, next day).
// Every path is then a valid itinerary and every weight is non-negative, so
// Dijkstra finds the cheapest route exactly.
export function cheapestRoute(
  flights: Flight[],
  search: RouteSearchRequest,
): RouteResult | null {
  const usable = flights.filter(
    (flight) =>
      (!search.departureDate || flight.departureDate >= search.departureDate) &&
      (!search.returnDate || flight.arrivalDate <= search.returnDate),
  )
  const legs = dijkstra(usable, search.origin, search.destination)
  if (!legs) return null

  const price = legs.reduce((total, leg) => total + cents(leg.price), 0)
  return {
    price: price / 100,
    connections: legs.length - 1,
    departureDate: legs[0].departureDate,
    arrivalDate: legs[legs.length - 1].arrivalDate,
    legs,
  }
}

// Whole cents, so sums compare exactly and float noise can't break ties.
const cents = (price: number) => Math.round(price * 100)

const nodeKey = (airport: string, day: string) => `${airport}|${day}`

interface Label {
  cents: number
  flights: number
  day: string
}

// Lowest price, then fewer flights, then the earlier day.
function before(a: Label, b: Label) {
  if (a.cents !== b.cents) return a.cents < b.cents
  if (a.flights !== b.flights) return a.flights < b.flights
  return a.day < b.day
}

function dijkstra(
  flights: Flight[],
  origin: string,
  destination: string,
): Flight[] | null {
  // Nodes: the days each airport is used. Edges: flights out of each node,
  // and the free wait to the airport's next day.
  const days = new Map<string, Set<string>>()
  const departures = new Map<string, Flight[]>()
  const markDay = (airport: string, day: string) =>
    (days.get(airport) ?? days.set(airport, new Set()).get(airport)!).add(day)
  for (const flight of flights) {
    markDay(flight.origin, flight.departureDate)
    markDay(flight.destination, flight.arrivalDate)
    const key = nodeKey(flight.origin, flight.departureDate)
    departures.set(key, [...(departures.get(key) ?? []), flight])
  }
  if (!days.has(origin)) return null

  const nextDay = new Map<string, { airport: string; day: string }>()
  for (const [airport, airportDays] of days) {
    const ordered = [...airportDays].sort()
    for (let i = 0; i + 1 < ordered.length; i += 1) {
      nextDay.set(nodeKey(airport, ordered[i]), {
        airport,
        day: ordered[i + 1],
      })
    }
  }

  const startDay = [...days.get(origin)!].sort()[0]
  const start = nodeKey(origin, startDay)
  // Best known label of each node, the node's airport, and how it was
  // reached (the previous node and the flight taken, or null for a wait).
  const best = new Map<string, Label>([
    [start, { cents: 0, flights: 0, day: startDay }],
  ])
  const airportOf = new Map([[start, origin]])
  const cameFrom = new Map<string, { node: string; flight: Flight | null }>()
  const settled = new Set<string>()
  const open = new Set([start])

  while (open.size > 0) {
    // Take the open node with the lowest label. The first destination node
    // taken is the cheapest route (ties: fewer flights, earliest arrival).
    let node = ''
    for (const candidate of open) {
      if (!node || before(best.get(candidate)!, best.get(node)!)) {
        node = candidate
      }
    }
    open.delete(node)
    settled.add(node)
    if (airportOf.get(node) === destination) return legsTo(cameFrom, node)

    const label = best.get(node)!
    const edges: { airport: string; day: string; flight: Flight | null }[] = (
      departures.get(node) ?? []
    ).map((flight) => ({
      airport: flight.destination,
      day: flight.arrivalDate,
      flight,
    }))
    const wait = nextDay.get(node)
    if (wait) edges.push({ ...wait, flight: null })

    for (const { airport, day, flight } of edges) {
      const neighbour = nodeKey(airport, day)
      if (settled.has(neighbour)) continue
      const candidate: Label = {
        cents: label.cents + (flight ? cents(flight.price) : 0),
        flights: label.flights + (flight ? 1 : 0),
        day,
      }
      const known = best.get(neighbour)
      if (!known || before(candidate, known)) {
        best.set(neighbour, candidate)
        airportOf.set(neighbour, airport)
        cameFrom.set(neighbour, { node, flight })
        open.add(neighbour)
      }
    }
  }
  return null
}

// Walk back from the destination, keeping the flights (not the waits).
function legsTo(
  cameFrom: Map<string, { node: string; flight: Flight | null }>,
  node: string,
): Flight[] {
  const legs: Flight[] = []
  for (let step = cameFrom.get(node); step; step = cameFrom.get(step.node)) {
    if (step.flight) legs.push(step.flight)
  }
  return legs.reverse()
}
