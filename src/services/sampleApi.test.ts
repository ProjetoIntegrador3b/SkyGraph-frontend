import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { sampleAirports, sampleRouteSearch } from './sampleApi'

describe('sample API', () => {
  it('lists every airport of the backend seed data', async () => {
    const airports = await sampleAirports()

    expect(airports).toHaveLength(40)
    expect(airports.map((airport) => airport.code)).toContain('GRU')
  })

  // Matches what the backend answers for the same seed data.
  it('finds the same cheapest route as the backend', async () => {
    const { route } = await sampleRouteSearch({
      origin: 'POA',
      destination: 'LHR',
    })

    expect(route?.price).toBe(3907.18)
    expect(route?.legs.map((leg) => leg.destination)).toEqual([
      'BEL',
      'FRA',
      'LHR',
    ])
  })

  it('rejects an unknown airport like the API does', async () => {
    const error = await sampleRouteSearch({
      origin: 'XXX',
      destination: 'GRU',
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
  })
})
