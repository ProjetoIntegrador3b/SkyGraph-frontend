import { describe, expect, it } from 'vitest'
import type { Flight } from '../types/route'
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

const uuids = (route: ReturnType<typeof cheapestRoute>) =>
  route?.legs.map((leg) => `${leg.origin}-${leg.destination}`)

describe('cheapestRoute', () => {
  it('prefers a cheaper route with a connection over a direct flight', () => {
    const flights = [
      flight('GRU', 'JFK', 900, '2027-01-10'),
      flight('GRU', 'MIA', 300, '2027-01-10'),
      flight('MIA', 'JFK', 200, '2027-01-11'),
    ]

    const route = cheapestRoute(flights, { origin: 'GRU', destination: 'JFK' })

    expect(uuids(route)).toEqual(['GRU-MIA', 'MIA-JFK'])
    expect(route).toMatchObject({
      price: 500,
      connections: 1,
      departureDate: '2027-01-10',
      arrivalDate: '2027-01-11',
    })
  })

  it('never connects to a flight that leaves before the last one lands', () => {
    const flights = [
      flight('GRU', 'JFK', 900, '2027-01-10'),
      flight('GRU', 'MIA', 300, '2027-01-10', '2027-01-12'),
      flight('MIA', 'JFK', 200, '2027-01-11'),
    ]

    const route = cheapestRoute(flights, { origin: 'GRU', destination: 'JFK' })

    expect(uuids(route)).toEqual(['GRU-JFK'])
  })

  it('uses only flights inside the period, each end optional', () => {
    const flights = [
      flight('GRU', 'JFK', 100, '2027-01-05'),
      flight('GRU', 'JFK', 200, '2027-01-15'),
      flight('GRU', 'JFK', 300, '2027-01-25'),
    ]
    const search = { origin: 'GRU', destination: 'JFK' }

    expect(
      cheapestRoute(flights, { ...search, departureDate: '2027-01-10' })?.price,
    ).toBe(200)
    expect(
      cheapestRoute(flights, {
        ...search,
        departureDate: '2027-01-20',
        returnDate: '2027-01-31',
      })?.price,
    ).toBe(300)
    expect(
      cheapestRoute(flights, { ...search, returnDate: '2027-01-04' }),
    ).toBeNull()
  })

  it('breaks price ties by fewer flights, then the earliest arrival', () => {
    const flights = [
      flight('GRU', 'MIA', 250, '2027-01-10'),
      flight('MIA', 'JFK', 250, '2027-01-10'),
      flight('GRU', 'JFK', 500, '2027-01-12'),
      flight('GRU', 'JFK', 500, '2027-01-11'),
    ]

    const route = cheapestRoute(flights, { origin: 'GRU', destination: 'JFK' })

    expect(route?.legs).toHaveLength(1)
    expect(route?.arrivalDate).toBe('2027-01-11')
  })

  it('has no limit on the number of connections', () => {
    const chain = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    const flights = chain
      .slice(1)
      .map((code, index) => flight(chain[index], code, 10, '2027-01-10'))

    const route = cheapestRoute(flights, { origin: 'A', destination: 'G' })

    expect(route?.legs).toHaveLength(6)
    expect(route?.connections).toBe(5)
  })

  // Plain Dijkstra over airports would keep only the cheapest way into MIA,
  // which lands after the only flight onwards has left.
  it('keeps a pricier arrival when only it makes the connection', () => {
    const flights = [
      flight('GRU', 'MIA', 100, '2027-01-09'),
      flight('GRU', 'MIA', 500, '2027-01-03'),
      flight('MIA', 'JFK', 400, '2027-01-05'),
    ]

    const route = cheapestRoute(flights, { origin: 'GRU', destination: 'JFK' })

    expect(route?.price).toBe(900)
    expect(route?.legs[0].departureDate).toBe('2027-01-03')
  })

  it('waits at an airport for a later flight', () => {
    const flights = [
      flight('GRU', 'MIA', 300, '2027-01-03'),
      flight('MIA', 'JFK', 200, '2027-01-20'),
    ]

    expect(
      uuids(cheapestRoute(flights, { origin: 'GRU', destination: 'JFK' })),
    ).toEqual(['GRU-MIA', 'MIA-JFK'])
  })

  it('adds prices in whole cents', () => {
    const flights = [
      flight('GRU', 'MIA', 0.1, '2027-01-10'),
      flight('MIA', 'JFK', 0.2, '2027-01-10'),
    ]

    expect(
      cheapestRoute(flights, { origin: 'GRU', destination: 'JFK' })?.price,
    ).toBe(0.3)
  })
})
