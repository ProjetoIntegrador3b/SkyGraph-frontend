import type { RouteSearchRequest, RouteSearchResponse } from '../types/route'
import { request, withSampleFallback } from './api'
import { sampleRouteSearch } from './sampleApi'

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
