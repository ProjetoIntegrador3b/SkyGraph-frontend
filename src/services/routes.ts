import type {
  RouteListResponse,
  RouteSearchRequest,
  RouteSearchResponse,
} from '../types/route'
import { request, withSampleFallback } from './api'
import { sampleAllRoutes, sampleRouteSearch } from './sampleApi'

export async function searchRoutes(
  search: RouteSearchRequest,
): Promise<RouteSearchResponse> {
  return withSampleFallback(
    () =>
      request<RouteSearchResponse>('/api/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(search),
      }),
    () => sampleRouteSearch(search),
  )
}

// Every route of the same search, cheapest first.
export async function fetchAllRoutes(
  search: RouteSearchRequest,
): Promise<RouteListResponse> {
  return withSampleFallback(
    () =>
      request<RouteListResponse>('/api/routes/all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(search),
      }),
    () => sampleAllRoutes(search),
  )
}
