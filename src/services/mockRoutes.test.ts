import { describe, expect, it } from 'vitest'
import { getMockRoutes } from './mockRoutes'

describe('mock route data', () => {
  it('provides a route in the API format for the search', () => {
    const { route } = getMockRoutes({
      origin: 'GRU',
      destination: 'JFK',
      departureDate: '2030-06-10',
      returnDate: '2030-06-20',
    })

    expect(route).not.toBeNull()
    expect(route?.legs[0].origin).toBe('GRU')
    expect(route?.legs.at(-1)?.destination).toBe('JFK')
    expect(route?.connections).toBe(route!.legs.length - 1)
    expect(route?.departureDate).toBe('2030-06-10')
  })
})
