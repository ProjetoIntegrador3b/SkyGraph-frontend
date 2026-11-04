import type { Airport } from '../types/airport'
import type {
  Flight,
  RouteSearchRequest,
  RouteSearchResponse,
} from '../types/route'
import { cheapestRoute } from '../utils/cheapestRoute'
import { ApiError, errorMessage } from './api'

// The sample network is a snapshot of the backend's seed data
// (initial_data_csv/aeroportos.csv and voos.csv). It answers like the API
// when mock mode is on or the API cannot be reached.
interface SampleNetwork {
  airports: Airport[]
  flights: Flight[]
}

// Loaded on first use, so the data stays out of the main bundle.
let network: Promise<SampleNetwork> | undefined

function loadNetwork() {
  network ??= import('../data/sample-network.json').then(
    (module) => module.default as SampleNetwork,
  )
  return network
}

// A short pause, so loading states show as they would against the API.
const delay = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms))

export async function sampleAirports(): Promise<Airport[]> {
  const { airports } = await loadNetwork()
  return airports
}

export async function sampleRouteSearch(
  search: RouteSearchRequest,
): Promise<RouteSearchResponse> {
  const { airports, flights } = await loadNetwork()
  await delay(350)

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

  return { route: cheapestRoute(flights, search) }
}
