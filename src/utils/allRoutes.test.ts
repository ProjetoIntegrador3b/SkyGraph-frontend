import { describe, expect, it } from 'vitest'
import network from '../data/sample-network.json'
import type { Flight } from '../types/route'
import { allRoutes } from './allRoutes'
import { cheapestRoute } from './cheapestRoute'

let next = 0
function flight(
  origin: string,
  destination: string,
  price: number,
  departureDate: string,
  arrivalDate = departureDate,
): Flight {
  next += 1
  return {
    uuid: `f${next}`,
    price,
    origin,
    destination,
    departureDate,
    arrivalDate,
  }
}

const paths = (list: ReturnType<typeof allRoutes>) =>
  list.routes.map((route) =>
    [route.legs[0].origin, ...route.legs.map((leg) => leg.destination)].join(
      '-',
    ),
  )

const search = { origin: 'GRU', destination: 'JFK' }

describe('allRoutes', () => {
  it('lists every route, cheapest first', () => {
    const flights = [
      flight('GRU', 'JFK', 3000, '2027-01-05'),
      flight('GRU', 'MIA', 900, '2027-01-05'),
      flight('MIA', 'JFK', 400, '2027-01-06'),
      flight('GRU', 'BOG', 1500, '2027-01-05'),
      flight('BOG', 'JFK', 700, '2027-01-07'),
    ]

    const list = allRoutes(flights, search)

    expect(paths(list)).toEqual(['GRU-MIA-JFK', 'GRU-BOG-JFK', 'GRU-JFK'])
    expect(list.routes[0].price).toBe(1300)
    expect(list.truncated).toBe(false)
  })

  it('connects only on or after the landing day', () => {
    const flights = [
      flight('GRU', 'MIA', 900, '2027-01-05', '2027-01-06'),
      flight('MIA', 'JFK', 100, '2027-01-05'),
      flight('MIA', 'JFK', 400, '2027-01-06'),
    ]

    expect(allRoutes(flights, search).routes.map((r) => r.price)).toEqual([
      1300,
    ])
  })

  it('never passes through an airport twice', () => {
    const flights = [
      flight('GRU', 'MIA', 900, '2027-01-05'),
      flight('MIA', 'GRU', 800, '2027-01-06'),
      flight('GRU', 'JFK', 3000, '2027-01-07'),
    ]

    expect(paths(allRoutes(flights, search))).toEqual(['GRU-JFK'])
  })

  it('keeps to the period of the search', () => {
    const flights = [
      flight('GRU', 'JFK', 1000, '2027-01-05'),
      flight('GRU', 'JFK', 2000, '2027-02-05'),
    ]

    const list = allRoutes(flights, { ...search, returnDate: '2027-01-31' })

    expect(list.routes.map((route) => route.price)).toEqual([1000])
  })

  it('stops at the limit', () => {
    const flights = [1, 2, 3, 4].map((day) =>
      flight('GRU', 'JFK', 1000 + day, `2027-01-0${day}`),
    )

    const list = allRoutes(flights, search, 2)

    expect(list.routes).toHaveLength(2)
    expect(list.truncated).toBe(true)
  })

  // The backend's test_all_routes.py checks the same on the seed data.
  it('starts with the cheapest route on every pair of the sample data', () => {
    const flights = network.flights as Flight[]
    const codes = network.airports.map((airport) => airport.code)

    for (const origin of codes) {
      for (const destination of codes) {
        if (origin === destination) continue
        const pair = { origin, destination }
        const list = allRoutes(flights, pair)
        expect(list.truncated).toBe(false)
        expect(list.routes[0] ?? null).toEqual(cheapestRoute(flights, pair))
      }
    }
    // As many as the backend lists for the same pair.
    expect(
      allRoutes(flights, { origin: 'POA', destination: 'LHR' }).routes,
    ).toHaveLength(382)
    // 1,560 pairs, each also searched with Dijkstra: a few seconds.
  }, 30_000)
})
