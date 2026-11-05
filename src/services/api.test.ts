import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  isUsingSampleData,
  request,
  subscribeToSampleData,
  withSampleFallback,
} from './api'

describe('request', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    // Here, not in the test, so a failing assertion can't leak fake timers.
    vi.useRealTimers()
  })

  it('returns the parsed body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true })),
    )

    await expect(request('/api/hello')).resolves.toEqual({ ok: true })
  })

  it.each([
    [404, 'Aeroporto não encontrado'],
    [422, 'Verifique os dados da busca'],
    [500, 'Não foi possível buscar as rotas.'],
  ])('turns HTTP %i into a readable message', async (status, message) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status }),
    )

    const error = (await request('/api/routes').catch(
      (caught: unknown) => caught,
    )) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(status)
    expect(error.message).toContain(message)
  })

  it('gives up on a server that does not answer in time', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () =>
            reject(init.signal?.reason),
          ),
        ),
    )

    const pending = request('/api/routes').catch((caught: unknown) => caught)
    await vi.advanceTimersByTimeAsync(12_000)

    expect(((await pending) as ApiError).status).toBe(0)
  })

  it('explains when the server cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))

    await expect(request('/api/routes')).rejects.toThrow(
      'Não foi possível conectar ao servidor',
    )
  })
})

describe('withSampleFallback', () => {
  const sample = () => Promise.resolve('sample')
  const failing = (status: number) => () =>
    Promise.reject(new ApiError(status, 'failed'))

  // Pin the defaults, so a developer's .env.local (e.g. mock mode on, as the
  // README suggests) can't change the outcome. Tests that need another value
  // stub it themselves.
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    vi.stubEnv('VITE_SAMPLE_FALLBACK', 'true')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('answers from the API when it is up', async () => {
    await expect(
      withSampleFallback(() => Promise.resolve('live'), sample),
    ).resolves.toBe('live')
  })

  it.each([0, 500, 503])(
    'falls back to the sample data on status %i',
    async (status) => {
      await expect(withSampleFallback(failing(status), sample)).resolves.toBe(
        'sample',
      )
      expect(isUsingSampleData()).toBe(true)
    },
  )

  it.each([404, 422])('passes the search error %i through', async (status) => {
    await expect(withSampleFallback(failing(status), sample)).rejects.toThrow(
      'failed',
    )
  })

  it('stays on the sample data once the API has failed', async () => {
    await withSampleFallback(failing(503), sample)
    const live = vi.fn()

    await expect(withSampleFallback(live, sample)).resolves.toBe('sample')
    expect(live).not.toHaveBeenCalled()
  })

  it('tries the API again a minute later and leaves the sample data', async () => {
    vi.useFakeTimers()
    await withSampleFallback(failing(503), sample)
    const notified = vi.fn()
    const unsubscribe = subscribeToSampleData(notified)

    vi.advanceTimersByTime(60_000)

    await expect(
      withSampleFallback(() => Promise.resolve('live'), sample),
    ).resolves.toBe('live')
    expect(isUsingSampleData()).toBe(false)
    expect(notified).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('stays on the sample data for another minute if the API is still down', async () => {
    vi.useFakeTimers()
    await withSampleFallback(failing(503), sample)
    vi.advanceTimersByTime(60_000)

    await expect(withSampleFallback(failing(0), sample)).resolves.toBe('sample')
    const live = vi.fn()
    vi.advanceTimersByTime(59_000)
    await expect(withSampleFallback(live, sample)).resolves.toBe('sample')
    expect(live).not.toHaveBeenCalled()
    expect(isUsingSampleData()).toBe(true)
  })

  it('leaves the sample data when the API answers with a search error', async () => {
    vi.useFakeTimers()
    await withSampleFallback(failing(503), sample)
    vi.advanceTimersByTime(60_000)

    await expect(withSampleFallback(failing(404), sample)).rejects.toThrow(
      'failed',
    )
    expect(isUsingSampleData()).toBe(false)
  })

  it('can be turned off', async () => {
    vi.stubEnv('VITE_SAMPLE_FALLBACK', 'false')

    await expect(withSampleFallback(failing(503), sample)).rejects.toThrow(
      'failed',
    )
  })

  it('answers from the sample data in mock mode', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true')
    const live = vi.fn()

    await expect(withSampleFallback(live, sample)).resolves.toBe('sample')
    expect(live).not.toHaveBeenCalled()
  })
})
