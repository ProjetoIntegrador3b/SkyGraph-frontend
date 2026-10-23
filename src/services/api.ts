// Production builds talk to the deployed backend; in development the Vite dev
// server proxies /api to a local backend. VITE_API_URL overrides both.
const PRODUCTION_API_URL = 'https://skygraph-backend.onrender.com'

export const apiUrl =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? PRODUCTION_API_URL : '')

export function isMockApi() {
  return import.meta.env.VITE_USE_MOCK_API === 'true'
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
  404: 'Aeroporto não encontrado. Verifique os códigos de origem e destino.',
  422: 'Verifique os dados da busca e tente novamente.',
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiUrl}${path}`, init)
  } catch {
    throw new ApiError(
      0,
      'Não foi possível conectar ao servidor. Tente novamente em instantes.',
    )
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      messages[response.status] ?? 'Não foi possível buscar as rotas.',
    )
  }

  return (await response.json()) as T
}
