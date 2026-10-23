import type { RouteSearchRequest, RouteSearchResponse } from '../types/route'
import { request, isMockApi } from './api'
import { searchMockRoutes } from './mockRoutes'

export async function searchRoutes(
  search: RouteSearchRequest,
): Promise<RouteSearchResponse> {
  if (isMockApi()) {
    return searchMockRoutes(search)
  }

  return request<RouteSearchResponse>('/api/routes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(search),
  })
}
