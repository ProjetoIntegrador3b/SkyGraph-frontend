import { describe, expect, it } from 'vitest'
import { getMockRoutes } from './mockRoutes'

describe('mock route data', () => {
  it('provides one route for every search criterion', () => {
    const routes = getMockRoutes({
      origin: 'GRU',
      destination: 'JFK',
      departureDate: '2030-06-10',
      returnDate: '2030-06-20',
    })

    expect(routes.price).not.toBeNull()
    expect(routes.connections).not.toBeNull()
    expect(routes.time).not.toBeNull()
    expect(routes.absolute).not.toBeNull()
  })
})
