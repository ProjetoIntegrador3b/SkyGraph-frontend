import type { Airport } from '../types/airport'
import type { RouteResult, RouteSearchRequest } from '../types/route'
import { traceCheapestRoute } from '../utils/cheapestRoute'
import type { DijkstraTrace, TraceStep } from '../utils/dijkstraTrace'
import { isMockApi, isUsingSampleData, request } from './api'
import { sampleNetwork } from './sampleApi'

// The trace as POST /api/routes/trace sends it: a relaxed edge names its
// flight by uuid (null for a wait) instead of carrying the whole flight.
interface ApiTrace extends Omit<DijkstraTrace, 'steps'> {
  steps: (Omit<TraceStep, 'relaxed'> & {
    relaxed: (Omit<TraceStep['relaxed'][number], 'flight'> & {
      flight: string | null
    })[]
  })[]
}

export interface RouteTrace {
  route: RouteResult | null
  trace: DijkstraTrace
  // Where to place the airports on the map.
  airports: Airport[]
  // "server": the backend's own steps, on its data. "browser": the same
  // Dijkstra rerun here on the bundled sample data.
  source: 'server' | 'browser'
}

function fromApi(trace: ApiTrace): DijkstraTrace {
  const flights = new Map(trace.flights.map((flight) => [flight.uuid, flight]))
  return {
    ...trace,
    steps: trace.steps.map((step) => ({
      ...step,
      relaxed: step.relaxed.map((edge) => ({
        ...edge,
        flight: edge.flight ? (flights.get(edge.flight) ?? null) : null,
      })),
    })),
  }
}

// The search step by step. Asks the backend for its own trace; when the page
// is on sample data, or the backend is down or predates the endpoint, reruns
// the search here instead.
export async function fetchRouteTrace(
  search: RouteSearchRequest,
  airports: Airport[],
): Promise<RouteTrace> {
  if (!isMockApi() && !isUsingSampleData()) {
    try {
      const response = await request<{
        route: RouteResult | null
        trace: ApiTrace
      }>('/api/routes/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(search),
      })
      return {
        route: response.route,
        trace: fromApi(response.trace),
        airports: airports.length ? airports : (await sampleNetwork()).airports,
        source: 'server',
      }
    } catch {
      // Fall back to the replay in the browser.
    }
  }
  const network = await sampleNetwork()
  const { route, trace } = traceCheapestRoute(network.flights, search)
  return { route, trace, airports: network.airports, source: 'browser' }
}
