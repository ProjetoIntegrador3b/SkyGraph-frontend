import { describe, expect, it } from 'vitest'
import { getMockRoutes } from './mockRoutes'

describe('mock route data', () => {
  it('provides the cheapest route for the search', () => {
    const routes = getMockRoutes({
      origin: 'GRU',
      destination: 'JFK',
      departureDate: '2030-06-10',
      returnDate: '2030-06-20',
    })

    expect(routes.route).not.toBeNull()
    expect(routes.route?.price).toBe(450)
  })
})
