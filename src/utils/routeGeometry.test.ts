import { describe, expect, it } from 'vitest'
import { airports, routeResponse } from '../test/api'
import type { Airport } from '../types/airport'
import type { RouteResult } from '../types/route'
import { routeGeometry } from './routeGeometry'

const jfk: Airport = {
  code: 'JFK',
  name: 'John F. Kennedy International Airport',
  city: 'Nova York',
  country: 'Estados Unidos',
  latitude: 40.6413,
  longitude: -73.7781,
}
const route = routeResponse.route!
const known = [...airports, jfk]

function leg(origin: string, destination: string) {
  return {
    uuid: `${origin}-${destination}`,
    price: 1,
    origin,
    destination,
    departureDate: '2027-01-01',
    arrivalDate: '2027-01-01',
  }
}

describe('routeGeometry', () => {
  it('marks every airport on the route with its role', () => {
    const geometry = routeGeometry(route, known)!

    expect(geometry.stops.map(({ code, role }) => [code, role])).toEqual([
      ['GRU', 'origin'],
      ['FOR', 'connection'],
      ['JFK', 'destination'],
    ])
    expect(geometry.stops[0]).toMatchObject({
      city: 'São Paulo',
      lat: -23.4356,
      lng: -46.4731,
    })
  })

  it('draws one arc per leg between the airports', () => {
    const { arcs } = routeGeometry(route, known)!

    expect(arcs).toEqual([
      {
        startLat: -23.4356,
        startLng: -46.4731,
        endLat: -3.7763,
        endLng: -38.5326,
        label: 'GRU → FOR',
      },
      {
        startLat: -3.7763,
        startLng: -38.5326,
        endLat: 40.6413,
        endLng: -73.7781,
        label: 'FOR → JFK',
      },
    ])
  })

  it('centres the camera between the airports', () => {
    const { view } = routeGeometry(route, known)!

    expect(view.lat).toBeGreaterThan(-23.4356)
    expect(view.lat).toBeLessThan(40.6413)
    expect(view.lng).toBeGreaterThan(-73.7781)
    expect(view.lng).toBeLessThan(-38.5326)
  })

  it('stays centred on routes across the 180° meridian', () => {
    const pacific: Airport[] = [
      { ...jfk, code: 'AAA', latitude: 0, longitude: 170 },
      { ...jfk, code: 'BBB', latitude: 0, longitude: -170 },
    ]
    const crossing: RouteResult = {
      ...route,
      connections: 0,
      legs: [leg('AAA', 'BBB')],
    }

    const { view } = routeGeometry(crossing, pacific)!

    // A plain average of the longitudes would give 0°, the far side.
    expect(Math.abs(view.lng)).toBeCloseTo(180)
  })

  it('backs the camera off further for longer routes', () => {
    const short: RouteResult = { ...route, legs: [leg('GRU', 'FOR')] }

    const near = routeGeometry(short, known)!.view.altitude
    const far = routeGeometry(route, known)!.view.altitude

    expect(far).toBeGreaterThan(near)
    expect(near).toBeGreaterThanOrEqual(1.3)
    expect(far).toBeLessThanOrEqual(2.2)
  })

  it('returns null when an airport position is unknown', () => {
    expect(routeGeometry(route, airports)).toBeNull()
  })
})
