// Production builds talk to the deployed backend; in development the Vite dev
// server proxies /api to a local backend. VITE_API_URL overrides both.
const PRODUCTION_API_URL = 'https://skygraph-backend.onrender.com'

export const apiUrl =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? PRODUCTION_API_URL : '')

// Always answer from the bundled sample data, without calling the API.
export function isMockApi() {
  return import.meta.env.VITE_USE_MOCK_API === 'true'
}

// Fall back to the sample data when the API is down. On unless turned off.
function sampleFallbackEnabled() {
  return import.meta.env.VITE_SAMPLE_FALLBACK !== 'false'
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const messages: Record<number, string> = {
  0: 'Não foi possível conectar ao servidor. Tente novamente em instantes.',
  404: 'Aeroporto não encontrado. Verifique os códigos de origem e destino.',
  422: 'Verifique os dados da busca e tente novamente.',
}

export function errorMessage(status: number) {
  return messages[status] ?? 'Não foi possível buscar as rotas.'
}

// A server that has not answered by then counts as unreachable, so the page
// falls back to the sample data instead of hanging (a hosted API that is down
// can take a minute to fail).
const REQUEST_TIMEOUT_MS = 12_000

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw new ApiError(0, errorMessage(0))
  }

  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(response.status))
  }

  return (await response.json()) as T
}

// Whether the page is showing sample data instead of the API's. Components
// subscribe to show a notice. Once the API has failed, the rest of the visit
// stays on the sample data: consistent answers, and no timeout per search.
let usingSampleData = false
const listeners = new Set<() => void>()

export function isUsingSampleData() {
  return usingSampleData
}

export function subscribeToSampleData(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// For tests, which share this module between cases.
export function resetSampleData() {
  usingSampleData = false
}

function markSampleData() {
  if (usingSampleData) return
  usingSampleData = true
  listeners.forEach((listener) => listener())
}

// Asks the API; answers from the sample data in mock mode, or when the API
// is unreachable or failing (no response, or a 5xx). Errors about the search
// itself (404, 422) are real answers and pass through.
export async function withSampleFallback<T>(
  live: () => Promise<T>,
  sample: () => Promise<T>,
): Promise<T> {
  if (isMockApi() || usingSampleData) {
    markSampleData()
    return sample()
  }
  try {
    return await live()
  } catch (error) {
    const down =
      error instanceof ApiError && (error.status === 0 || error.status >= 500)
    if (!down || !sampleFallbackEnabled()) throw error
    markSampleData()
    return sample()
  }
}
