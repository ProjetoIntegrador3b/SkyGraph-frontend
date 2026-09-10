import type { RouteSearchRequest, RouteSearchResponse } from '../types/route'

export function getMockRoutes(
  request: RouteSearchRequest,
): RouteSearchResponse {
  void request

  return {
    price: {
      price: 450,
      connections: 2,
      duration: '8h 20min',
    },
    connections: {
      price: 620,
      connections: 1,
      duration: '9h 10min',
    },
    time: {
      price: 900,
      connections: 2,
      duration: '6h 45min',
    },
    absolute: {
      price: 500,
      connections: 1,
      duration: '7h 30min',
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
