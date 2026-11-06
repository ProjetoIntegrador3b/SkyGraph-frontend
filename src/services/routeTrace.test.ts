import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import network from '../data/sample-network.json'
import type { Flight } from '../types/route'
import { traceCheapestRoute } from '../utils/cheapestRoute'
import { ApiError, resetSampleData, withSampleFallback } from './api'
import { fetchRouteTrace } from './routeTrace'

const search = { origin: 'POA', destination: 'LHR' }
const local = traceCheapestRoute(network.flights as Flight[], search)

// The same trace in the shape the API sends: flights named by uuid.
const apiTrace = {
  route: local.route,
  trace: {
    ...local.trace,
    steps: local.trace.steps.map((step) => ({
      ...step,
      relaxed: step.relaxed.map((edge) => ({
        ...edge,
        flight: edge.flight?.uuid ?? null,
      })),
    })),
  },
}

const airports = [
  {
    code: 'POA',
    name: 'Aeroporto de Porto Alegre',
    city: 'Porto Alegre',
    country: 'Brasil',
    latitude: -29.99,
    longitude: -51.17,
  },
]

describe('fetchRouteTrace', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    vi.stubEnv('VITE_SAMPLE_FALLBACK', 'true')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('uses the steps the backend took', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(apiTrace)))

    const result = await fetchRouteTrace(search, airports)

    expect(fetch).toHaveBeenCalledWith(
      '/api/routes/trace',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(search) }),
    )
    expect(result.source).toBe('server')
    expect(result.airports).toBe(airports)
    // Relaxed edges get their whole flight back; waits stay null.
    expect(result.trace).toEqual(local.trace)
  })

  it.each([
    ['is down', () => Promise.reject(new TypeError('offline'))],
    [
      'predates the endpoint',
      () =>
        Promise.resolve(
          new Response('{"detail":"Not Found"}', { status: 404 }),
        ),
    ],
  ])('reruns the search here when the backend %s', async (_, answer) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(answer)

    const result = await fetchRouteTrace(search, airports)

    expect(result.source).toBe('browser')
    expect(result.trace).toEqual(local.trace)
    expect(result.airports).toHaveLength(40)
  })

  it('does not call the API in mock mode', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true')
    const fetch = vi.spyOn(globalThis, 'fetch')

    const result = await fetchRouteTrace(search, airports)

    expect(fetch).not.toHaveBeenCalled()
    expect(result.source).toBe('browser')
  })

  it('stays on the sample data the page fell back to', async () => {
    await withSampleFallback(
      () => Promise.reject(new ApiError(0, 'offline')),
      () => Promise.resolve(null),
    )
    const fetch = vi.spyOn(globalThis, 'fetch')

    const result = await fetchRouteTrace(search, airports)

    expect(fetch).not.toHaveBeenCalled()
    expect(result.source).toBe('browser')
    resetSampleData()
  })
})
