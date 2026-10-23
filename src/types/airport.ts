export interface Airport {
  code: string
  name: string
  city: string
  country: string
  latitude: number
  longitude: number
}

export interface AirportPage {
  items: Airport[]
  page: number
  pageSize: number
  total: number
}
