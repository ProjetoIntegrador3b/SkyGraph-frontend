import type { Airport } from '../types/airport'
import type { RouteResult } from '../types/route'

export type StopRole = 'origin' | 'connection' | 'destination'

export interface GlobeStop {
  code: string
  city: string
  lat: number
  lng: number
  role: StopRole
}

export interface GlobeArc {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  label: string
}

export interface GlobeView {
  lat: number
  lng: number
  // Camera height above the surface, in globe radii.
  altitude: number
}

export interface RouteGeometry {
  stops: GlobeStop[]
  arcs: GlobeArc[]
  view: GlobeView
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180
const toDegrees = (radians: number) => (radians * 180) / Math.PI

function toVector({ lat, lng }: { lat: number; lng: number }) {
  const phi = toRadians(lat)
  const lambda = toRadians(lng)
  return [
    Math.cos(phi) * Math.cos(lambda),
    Math.cos(phi) * Math.sin(lambda),
    Math.sin(phi),
  ]
}

// Angle between two points as seen from the centre of the Earth.
function angleBetween(a: number[], b: number[]) {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  return Math.acos(Math.min(1, Math.max(-1, dot)))
}

// Centre the camera on the mean position of the stops, taken on the sphere so
// it stays right for routes that cross the 180° meridian, and back off far
// enough that every stop is in view.
function viewFor(stops: GlobeStop[]): GlobeView {
  const vectors = stops.map(toVector)
  const sum = vectors.reduce(
    (total, v) => [total[0] + v[0], total[1] + v[1], total[2] + v[2]],
    [0, 0, 0],
  )
  const length = Math.hypot(sum[0], sum[1], sum[2]) || 1
  const centre = sum.map((value) => value / length)
  const spread = Math.max(...vectors.map((v) => angleBetween(centre, v)))

  return {
    lat: toDegrees(Math.asin(centre[2])),
    lng: toDegrees(Math.atan2(centre[1], centre[0])),
    altitude: Math.min(2.2, Math.max(1.3, spread * 2)),
  }
}

// What the globe draws for a route: one stop per airport on it, one arc per
// leg, and the camera position. Null when an airport's position is unknown
// (e.g. the airport list failed to load), so the globe is not shown.
export function routeGeometry(
  route: RouteResult,
  airports: Airport[],
): RouteGeometry | null {
  const byCode = new Map(airports.map((airport) => [airport.code, airport]))
  const codes = [
    route.legs[0].origin,
    ...route.legs.map((leg) => leg.destination),
  ]
  if (!codes.every((code) => byCode.has(code))) return null

  const stops = codes.map((code, index): GlobeStop => {
    const airport = byCode.get(code)!
    const role: StopRole =
      index === 0
        ? 'origin'
        : index === codes.length - 1
          ? 'destination'
          : 'connection'
    return {
      code,
      city: airport.city,
      lat: airport.latitude,
      lng: airport.longitude,
      role,
    }
  })

  const arcs = route.legs.map((leg, index): GlobeArc => ({
    startLat: stops[index].lat,
    startLng: stops[index].lng,
    endLat: stops[index + 1].lat,
    endLng: stops[index + 1].lng,
    label: `${leg.origin} → ${leg.destination}`,
  }))

  return { stops, arcs, view: viewFor(stops) }
}
