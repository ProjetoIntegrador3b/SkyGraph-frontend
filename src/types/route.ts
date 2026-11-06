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

// Every route of a search, cheapest first (POST /api/routes/all).
export interface RouteListResponse {
  routes: RouteResult[]
  // True when there were more routes than the list holds.
  truncated: boolean
}

// Both dates are optional; a missing one leaves that end of the period open.
export interface RouteSearchRequest {
  origin: string
  destination: string
  departureDate?: string
  returnDate?: string
}
