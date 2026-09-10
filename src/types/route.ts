export type RouteCriterion = 'price' | 'connections' | 'time' | 'absolute'

export interface RouteLeg {
  origin: string
  destination: string
  duration?: string
}

export interface RouteResult {
  price: number
  connections: number
  duration: string
  legs?: RouteLeg[]
}

export interface RouteSearchResponse {
  price: RouteResult | null
  connections: RouteResult | null
  time: RouteResult | null
  absolute: RouteResult | null
}

export interface RouteSearchRequest {
  origin: string
  destination: string
  departureDate: string
  returnDate: string
}
