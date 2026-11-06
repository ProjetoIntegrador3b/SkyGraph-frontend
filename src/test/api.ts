import { vi } from 'vitest'
import type { Airport } from '../types/airport'
import type { RouteListResponse, RouteSearchResponse } from '../types/route'

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

// POST /api/routes/all for the same search: the route above, and a pricier
// direct flight.
export const allRoutesResponse: RouteListResponse = {
  routes: [
    routeResponse.route!,
    {
      price: 2150.4,
      connections: 0,
      departureDate: '2027-01-14',
      arrivalDate: '2027-01-14',
      legs: [
        {
          uuid: 'leg-3',
          price: 2150.4,
          origin: 'GRU',
          destination: 'JFK',
          departureDate: '2027-01-14',
          arrivalDate: '2027-01-14',
        },
      ],
    },
  ],
  truncated: false,
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

// Answers the airport list, the route search and the list of every route
// like the real API, so the page can be tested without a backend.
export function mockApi(
  route: { body?: unknown; status?: number; all?: unknown } = {},
) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/api/airports')) {
      return json({ items: airports, page: 1, pageSize: 200, total: 2 })
    }
    if (url.includes('/api/routes/all')) {
      return json(route.all ?? allRoutesResponse)
    }
    return json(route.body ?? routeResponse, route.status ?? 200)
  })
}
