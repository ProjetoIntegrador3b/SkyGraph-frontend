import type { Airport, AirportPage } from '../types/airport'
import { request, withSampleFallback } from './api'
import { sampleAirports } from './sampleApi'

// The API caps a page at 200, which covers every airport in the data set.
const PAGE_SIZE = 200

export async function fetchAirports(): Promise<Airport[]> {
  return withSampleFallback(
    async () =>
      (await request<AirportPage>(`/api/airports?pageSize=${PAGE_SIZE}`)).items,
    sampleAirports,
  )
}
