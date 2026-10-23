import { vi } from 'vitest'
import type { Airport } from '../types/airport'
import type { RouteSearchResponse } from '../types/route'

export const airports: Airport[] = [
  {
    code: 'FOR',
    name: 'Aeroporto Internacional de Fortaleza',
    city: 'Fortaleza',
    country: 'Brasil',
    latitude: -3.7763,
    longitude: -38.5326,
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

export const routeResponse: RouteSearchResponse = {
  route: {
    price: 984.95,
    connections: 1,
    departureDate: '2027-01-11',
    arrivalDate: '2027-01-13',
    legs: [
      {
        uuid: 'leg-1',
        price: 682.94,
        origin: 'GRU',
        destination: 'FOR',
        departureDate: '2027-01-11',
        arrivalDate: '2027-01-11',
      },
      {
        uuid: 'leg-2',
        price: 302.01,
        origin: 'FOR',
        destination: 'JFK',
        departureDate: '2027-01-12',
        arrivalDate: '2027-01-13',
      },
    ],
  },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

// Answers the airport list and the route search like the real API, so the
// page can be tested without a backend.
export function mockApi(route: { body?: unknown; status?: number } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/api/airports')) {
      return json({ items: airports, page: 1, pageSize: 200, total: 2 })
    }
    return json(route.body ?? routeResponse, route.status ?? 200)
  })
}
