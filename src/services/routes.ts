import type { RouteSearchRequest, RouteSearchResponse } from '../types/route'
import { searchMockRoutes } from './mockRoutes'

const routesEndpoint = import.meta.env.VITE_API_ROUTES_URL ?? '/api/routes'

export async function searchRoutes(
  request: RouteSearchRequest,
): Promise<RouteSearchResponse> {
  if (import.meta.env.VITE_USE_MOCK_API === 'true') {
    return searchMockRoutes(request)
  }

  const response = await fetch(routesEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error('Não foi possível buscar as rotas.')
  }

  return (await response.json()) as RouteSearchResponse
}
