// Dates are ISO calendar days (YYYY-MM-DD), as the API sends them.

export interface Flight {
  uuid: string
  price: number
  origin: string
  destination: string
  departureDate: string
  arrivalDate: string
}

export interface RouteResult {
  price: number
  connections: number
  departureDate: string
  arrivalDate: string
  legs: Flight[]
}

export interface RouteSearchResponse {
  route: RouteResult | null
}

export interface RouteSearchRequest {
  origin: string
  destination: string
  departureDate: string
  returnDate: string
}
