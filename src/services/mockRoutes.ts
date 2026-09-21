import type { RouteSearchRequest, RouteSearchResponse } from '../types/route'

export function getMockRoutes(
  request: RouteSearchRequest,
): RouteSearchResponse {
  void request

  return {
    route: {
      price: 450,
      connections: 2,
      duration: '8h 20min',
    },
  }
}

export function searchMockRoutes(
  request: RouteSearchRequest,
): Promise<RouteSearchResponse> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(getMockRoutes(request)), 350)
  })
}
