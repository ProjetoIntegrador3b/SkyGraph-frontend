import type { Airport } from '../types/airport'
import type {
  Flight,
  RouteListResponse,
  RouteSearchRequest,
  RouteSearchResponse,
} from '../types/route'
import { allRoutes } from '../utils/allRoutes'
import { cheapestRoute } from '../utils/cheapestRoute'
import { ApiError, errorMessage } from './api'

// The sample network is a snapshot of the backend's seed data
// (initial_data_csv/aeroportos.csv and voos.csv). It answers like the API
// when mock mode is on or the API cannot be reached.
interface SampleNetwork {
  airports: Airport[]
  flights: Flight[]
}

// Loaded on first use, so the data stays out of the main bundle. If the chunk
// cannot be loaded (offline, or gone after a redeploy), searches show the
// usual "cannot connect" message rather than the browser's own error.
// Browsers remember a failed module, so retrying the import would not help.
let network: Promise<SampleNetwork> | undefined

function loadNetwork() {
  network ??= import('../data/sample-network.json').then(
    (module) => module.default as SampleNetwork,
    () => {
      throw new ApiError(0, errorMessage(0))
    },
  )
  return network
}

// A short pause, so loading states show as they would against the API.
const delay = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms))

// The whole network, for the graph explorer's replay of the search.
export function sampleNetwork(): Promise<SampleNetwork> {
  return loadNetwork()
}

export async function sampleAirports(): Promise<Airport[]> {
  const { airports } = await loadNetwork()
  return airports
}

// The same checks as the API: unknown airports and invalid searches.
function checkSearch(airports: Airport[], search: RouteSearchRequest) {
  const known = new Set(airports.map((airport) => airport.code))
  if (!known.has(search.origin) || !known.has(search.destination)) {
    throw new ApiError(404, errorMessage(404))
  }
  if (
    search.origin === search.destination ||
    (search.departureDate &&
      search.returnDate &&
      search.returnDate < search.departureDate)
  ) {
    throw new ApiError(422, errorMessage(422))
  }
}

export async function sampleRouteSearch(
  search: RouteSearchRequest,
): Promise<RouteSearchResponse> {
  const { airports, flights } = await loadNetwork()
  await delay(350)
  checkSearch(airports, search)
  return { route: cheapestRoute(flights, search) }
}

export async function sampleAllRoutes(
  search: RouteSearchRequest,
): Promise<RouteListResponse> {
  const { airports, flights } = await loadNetwork()
  await delay(350)
  checkSearch(airports, search)
  return allRoutes(flights, search)
}
