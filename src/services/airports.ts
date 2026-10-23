import type { Airport, AirportPage } from '../types/airport'
import { request, isMockApi } from './api'
import { mockAirports } from './mockRoutes'

// The API caps a page at 200, which covers every airport in the data set.
const PAGE_SIZE = 200

export async function fetchAirports(): Promise<Airport[]> {
  if (isMockApi()) {
    return mockAirports
  }

  const page = await request<AirportPage>(`/api/airports?pageSize=${PAGE_SIZE}`)
  return page.items
}
