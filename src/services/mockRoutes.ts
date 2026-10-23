import type { Airport } from '../types/airport'
import type { RouteSearchRequest, RouteSearchResponse } from '../types/route'

export const mockAirports: Airport[] = [
  {
    code: 'FOR',
    name: 'Aeroporto Internacional de Fortaleza',
    city: 'Fortaleza',
    country: 'Brasil',
    latitude: -3.7763,
    longitude: -38.5326,
  },
  {
    code: 'GIG',
    name: 'Aeroporto Internacional do Galeão',
    city: 'Rio de Janeiro',
    country: 'Brasil',
    latitude: -22.81,
    longitude: -43.2506,
  },
  {
    code: 'GRU',
    name: 'Aeroporto Internacional de Guarulhos',
    city: 'São Paulo',
    country: 'Brasil',
    latitude: -23.4356,
    longitude: -46.4731,
  },
]

// A one-connection route that starts on the first day of the search.
export function getMockRoutes(search: RouteSearchRequest): RouteSearchResponse {
  const day = search.departureDate

  return {
    route: {
      price: 984.95,
      connections: 1,
      departureDate: day,
      arrivalDate: day,
      legs: [
        {
          uuid: 'mock-leg-1',
          price: 682.94,
          origin: search.origin,
          destination: 'FOR',
          departureDate: day,
          arrivalDate: day,
        },
        {
          uuid: 'mock-leg-2',
          price: 302.01,
          origin: 'FOR',
          destination: search.destination,
          departureDate: day,
          arrivalDate: day,
        },
      ],
    },
  }
}

export function searchMockRoutes(
  search: RouteSearchRequest,
): Promise<RouteSearchResponse> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(getMockRoutes(search)), 350)
  })
}
