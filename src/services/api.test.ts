import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './api'

describe('request', () => {
  afterEach(() => {
    vi.restoreAllMocks()
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

  it('explains when the server cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))

    await expect(request('/api/routes')).rejects.toThrow(
      'Não foi possível conectar ao servidor',
    )
  })
})
