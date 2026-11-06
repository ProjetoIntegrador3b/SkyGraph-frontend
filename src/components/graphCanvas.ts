import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import countriesTopology from 'world-atlas/countries-110m.json'
import type { Airport } from '../types/airport'
import type { Flight } from '../types/route'
import {
  airportOfKey,
  type DijkstraTrace,
  type TraceState,
} from '../utils/dijkstraTrace'

// Canvas drawing for the graph explorer. Two views of the same search:
// - "time": the time-expanded graph Dijkstra actually runs on. One row per
//   airport, days left to right; a flight is a curve between rows, a wait a
//   segment along a row.
// - "map": the airports where they are, flights as arcs between them.

export type View = 'time' | 'map'

export interface Palette {
  text: string
  muted: string
  origin: string
  connection: string
  destination: string
  accent: string
}

interface Point {
  x: number
  y: number
}

export interface Hit {
  x: number
  y: number
  // A node key in the time view, an airport code on the map.
  id: string
}

export interface Layout {
  view: View
  width: number
  height: number
  // Where a node is drawn: its own dot (time) or its airport (map).
  point(key: string): Point | undefined
  hits: Hit[]
  // Time view only: rows, the day axis and month ticks.
  rows: string[]
  rowHeight: number
  left: number
  top: number
  ticks: { x: number; label: string }[]
  // Map view only: airports placed by longitude and latitude.
  airports: Map<string, Point>
  project?: (lon: number, lat: number) => Point
}

export function readPalette(element: HTMLElement): Palette {
  const style = getComputedStyle(element)
  const read = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback
  return {
    text: read('--text', '#eef0f8'),
    muted: read('--text-muted', '#a0a7c2'),
    origin: read('--role-origin', '#7cc4ff'),
    connection: read('--role-connection', '#ffc857'),
    destination: read('--role-destination', '#ff6b3d'),
    accent: read('--accent', '#ff6b3d'),
  }
}

// #rrggbb (or #rgb) with an alpha; other colours pass through unchanged.
function rgba(colour: string, alpha: number) {
  let hex = colour.replace('#', '')
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)) return colour
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('')
  const n = parseInt(hex, 16)
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

function mix(a: string, b: string, t: number) {
  const parse = (c: string) => {
    let hex = c.replace('#', '')
    if (hex.length === 3) hex = [...hex].map((x) => x + x).join('')
    const n = parseInt(hex, 16)
    return [n >> 16, (n >> 8) & 255, n & 255]
  }
  const [ra, ga, ba] = parse(a)
  const [rb, gb, bb] = parse(b)
  const at = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `rgb(${at(ra, rb)}, ${at(ga, gb)}, ${at(ba, bb)})`
}

// Cheap is cool, expensive is hot: origin blue → connection amber →
// destination orange, as a share of the most expensive label in the search.
export function heat(palette: Palette, share: number) {
  const t = Math.max(0, Math.min(1, share))
  return t < 0.5
    ? mix(palette.origin, palette.connection, t * 2)
    : mix(palette.connection, palette.destination, (t - 0.5) * 2)
}

const MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000

export function buildLayout(
  view: View,
  trace: DijkstraTrace,
  airports: Airport[],
  width: number,
  height: number,
): Layout {
  return view === 'time'
    ? timeLayout(trace, airports, width, height)
    : mapLayout(trace, airports, width, height)
}

function timeLayout(
  trace: DijkstraTrace,
  airports: Airport[],
  width: number,
  height: number,
): Layout {
  const longitude = new Map(airports.map((a) => [a.code, a.longitude]))
  const used = new Set(trace.nodes.map((node) => node.airport))
  used.add(trace.origin)
  used.add(trace.destination)
  // Origin on top, destination at the bottom, the rest west to east.
  const middle = [...used]
    .filter((code) => code !== trace.origin && code !== trace.destination)
    .sort(
      (a, b) =>
        (longitude.get(a) ?? 0) - (longitude.get(b) ?? 0) || a.localeCompare(b),
    )
  const rows = [trace.origin, ...middle, trace.destination]
  const rowOf = new Map(rows.map((code, index) => [code, index]))

  const days = trace.nodes.map((node) => dayNumber(node.day))
  const first = days.length ? Math.min(...days) : 0
  const last = days.length ? Math.max(...days) : 1
  const span = Math.max(1, last - first)

  const left = 54
  const right = 18
  const top = 34
  const bottom = 16
  const rowHeight = (height - top - bottom) / rows.length
  const dayWidth = (width - left - right) / span
  const x = (day: string) => left + (dayNumber(day) - first) * dayWidth

  const points = new Map<string, Point>()
  for (const node of trace.nodes) {
    points.set(node.key, {
      x: x(node.day),
      y: top + (rowOf.get(node.airport)! + 0.5) * rowHeight,
    })
  }

  // A tick on the first of each month inside the range.
  const ticks: Layout['ticks'] = []
  if (days.length) {
    const start = new Date(first * 86_400_000)
    let year = start.getUTCFullYear()
    let month = start.getUTCMonth() + 1
    for (;;) {
      if (month > 11) {
        month = 0
        year += 1
      }
      const at = Date.UTC(year, month, 1) / 86_400_000
      if (at > last) break
      // Leave out a tick too close to the right edge for its label.
      if (left + (at - first) * dayWidth > width - right - 30) break
      ticks.push({
        x: left + (at - first) * dayWidth,
        label: month === 0 ? `${MONTHS[month]} ${year}` : MONTHS[month],
      })
      month += 1
    }
  }

  return {
    view: 'time',
    width,
    height,
    point: (key) => points.get(key),
    hits: [...points].map(([id, p]) => ({ id, ...p })),
    rows,
    rowHeight,
    left,
    top,
    ticks,
    airports: new Map(),
  }
}

// Bounds that hold every airport in the data set with a little air.
const LON = [-128, 160]
const LAT = [-44, 62]

function mapLayout(
  trace: DijkstraTrace,
  airports: Airport[],
  width: number,
  height: number,
): Layout {
  const pad = 20
  const scale = Math.min(
    (width - pad * 2) / (LON[1] - LON[0]),
    (height - pad * 2) / (LAT[1] - LAT[0]),
  )
  const ox = (width - (LON[1] - LON[0]) * scale) / 2
  const oy = (height - (LAT[1] - LAT[0]) * scale) / 2
  const project = (lon: number, lat: number) => ({
    x: ox + (lon - LON[0]) * scale,
    y: oy + (LAT[1] - lat) * scale,
  })

  const used = new Set(trace.nodes.map((node) => node.airport))
  used.add(trace.origin)
  used.add(trace.destination)
  const placed = new Map<string, Point>()
  for (const airport of airports) {
    if (used.has(airport.code)) {
      placed.set(airport.code, project(airport.longitude, airport.latitude))
    }
  }

  return {
    view: 'map',
    width,
    height,
    point: (key) => placed.get(airportOfKey(key)),
    hits: [...placed].map(([id, p]) => ({ id, ...p })),
    rows: [],
    rowHeight: 0,
    left: 0,
    top: 0,
    ticks: [],
    airports: placed,
    project,
  }
}

let countries: [number, number][][] | undefined

// Country outlines as rings of [lon, lat], decoded once.
function countryRings() {
  if (countries) return countries
  const topology = countriesTopology as unknown as Topology<{
    countries: GeometryCollection
  }>
  const rings: [number, number][][] = []
  for (const country of feature(topology, topology.objects.countries)
    .features) {
    const geometry = country.geometry
    if (geometry.type === 'Polygon') {
      rings.push(...(geometry.coordinates as [number, number][][]))
    } else if (geometry.type === 'MultiPolygon') {
      for (const polygon of geometry.coordinates as [number, number][][][]) {
        rings.push(...polygon)
      }
    }
  }
  countries = rings
  return rings
}

// Starts a path for an edge; false when it cannot be drawn in this view.
function edgePath(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  from: string,
  to: string,
  flight: Flight | null,
) {
  const a = layout.point(from)
  const b = layout.point(to)
  if (!a || !b) return false
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  if (layout.view === 'time') {
    if (!flight) {
      ctx.lineTo(b.x, b.y)
    } else {
      // Bow sideways, so same-day flights don't stack on one vertical line.
      const bow = (b.y - a.y) * 0.18
      ctx.quadraticCurveTo((a.x + b.x) / 2 + bow, (a.y + b.y) / 2, b.x, b.y)
    }
    return true
  }
  if (!flight || (a.x === b.x && a.y === b.y)) return false
  const dx = b.x - a.x
  const dy = b.y - a.y
  ctx.quadraticCurveTo(
    (a.x + b.x) / 2 + dy * 0.2,
    (a.y + b.y) / 2 - dx * 0.2,
    b.x,
    b.y,
  )
  return true
}

const nodeOf = (flight: Flight, end: 'from' | 'to') =>
  end === 'from'
    ? `${flight.origin}|${flight.departureDate}`
    : `${flight.destination}|${flight.arrivalDate}`

// The parts that never change during the replay, drawn once per size.
export function drawBase(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  trace: DijkstraTrace,
  palette: Palette,
) {
  ctx.clearRect(0, 0, layout.width, layout.height)
  ctx.lineCap = 'round'

  if (layout.view === 'time') {
    // Months
    ctx.font = '600 10px "JetBrains Mono Variable", ui-monospace, monospace'
    ctx.textBaseline = 'top'
    for (const tick of layout.ticks) {
      ctx.strokeStyle = rgba(palette.text, 0.06)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(tick.x, layout.top - 6)
      ctx.lineTo(tick.x, layout.height - 8)
      ctx.stroke()
      ctx.fillStyle = palette.muted
      ctx.fillText(tick.label.toUpperCase(), tick.x + 4, 10)
    }
    // Rows
    ctx.textBaseline = 'middle'
    const labelSize = Math.max(8, Math.min(11, layout.rowHeight * 0.75))
    layout.rows.forEach((code, index) => {
      const y = layout.top + (index + 0.5) * layout.rowHeight
      const end =
        code === trace.origin
          ? palette.origin
          : code === trace.destination
            ? palette.destination
            : null
      ctx.strokeStyle = rgba(palette.text, end ? 0.12 : 0.04)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(layout.left - 4, y)
      ctx.lineTo(layout.width - 12, y)
      ctx.stroke()
      ctx.font = `${end ? 700 : 500} ${labelSize}px "JetBrains Mono Variable", ui-monospace, monospace`
      ctx.fillStyle = end ?? rgba(palette.text, 0.55)
      ctx.fillText(code, 10, y)
    })
    // Waits, then flights, then nodes: the whole graph, faint.
    ctx.strokeStyle = rgba(palette.text, 0.1)
    ctx.lineWidth = 1
    for (const wait of trace.waits) {
      if (edgePath(ctx, layout, wait.from, wait.to, null)) ctx.stroke()
    }
    ctx.strokeStyle = rgba(palette.text, 0.07)
    for (const flight of trace.flights) {
      if (
        edgePath(
          ctx,
          layout,
          nodeOf(flight, 'from'),
          nodeOf(flight, 'to'),
          flight,
        )
      ) {
        ctx.stroke()
      }
    }
    ctx.fillStyle = rgba(palette.text, 0.28)
    for (const hit of layout.hits) {
      ctx.beginPath()
      ctx.arc(hit.x, hit.y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
    return
  }

  // Map: countries, every route, every airport.
  const project = layout.project!
  ctx.fillStyle = rgba(palette.text, 0.035)
  ctx.strokeStyle = rgba(palette.text, 0.1)
  ctx.lineWidth = 0.7
  for (const ring of countryRings()) {
    ctx.beginPath()
    ring.forEach(([lon, lat], index) => {
      const p = project(lon, lat)
      // A jump across the antimeridian starts a new segment.
      if (index === 0 || Math.abs(lon - ring[index - 1][0]) > 180) {
        ctx.moveTo(p.x, p.y)
      } else {
        ctx.lineTo(p.x, p.y)
      }
    })
    ctx.fill()
    ctx.stroke()
  }
  const seen = new Set<string>()
  ctx.strokeStyle = rgba(palette.text, 0.07)
  ctx.lineWidth = 1
  for (const flight of trace.flights) {
    const pair = `${flight.origin}>${flight.destination}`
    if (seen.has(pair)) continue
    seen.add(pair)
    if (
      edgePath(
        ctx,
        layout,
        nodeOf(flight, 'from'),
        nodeOf(flight, 'to'),
        flight,
      )
    ) {
      ctx.stroke()
    }
  }
  ctx.font = '500 9px "JetBrains Mono Variable", ui-monospace, monospace'
  ctx.textBaseline = 'middle'
  for (const [code, p] of layout.airports) {
    ctx.fillStyle = rgba(palette.text, 0.3)
    ctx.beginPath()
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = rgba(palette.text, 0.35)
    ctx.fillText(code, p.x + 5, p.y - 6)
  }
}

export interface FrameOptions {
  // Milliseconds, for the pulse; a fixed value draws a still frame.
  now: number
  hover: string | null
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  base: CanvasImageSource,
  layout: Layout,
  trace: DijkstraTrace,
  state: TraceState,
  palette: Palette,
  { now, hover }: FrameOptions,
) {
  ctx.clearRect(0, 0, layout.width, layout.height)
  ctx.drawImage(base, 0, 0, layout.width, layout.height)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const maxCents = Math.max(1, ...trace.steps.map((step) => step.cents))
  const colourOf = (cents: number) => heat(palette, cents / maxCents)
  const time = layout.view === 'time'

  // The tree Dijkstra has grown. On the time graph: how each reached node
  // was reached. On the map, one arc per airport: the flight that first
  // reached it at its cheapest, so the shortest-path tree stays readable.
  if (time) {
    ctx.lineWidth = 1.3
    for (const [to, { from, flight }] of state.parent) {
      const label = state.best.get(to)!
      ctx.strokeStyle = rgba(
        colourOf(label.cents),
        state.settled.has(to) ? 0.6 : 0.3,
      )
      if (edgePath(ctx, layout, from, to, flight)) ctx.stroke()
    }
  } else {
    ctx.lineWidth = 2
    for (const { node, cents } of state.reached.values()) {
      // Walk back past waits to the flight that arrived.
      let step = state.parent.get(node)
      while (step && !step.flight) step = state.parent.get(step.from)
      if (!step?.flight) continue
      ctx.strokeStyle = rgba(colourOf(cents), 0.75)
      if (edgePath(ctx, layout, step.from, node, step.flight)) ctx.stroke()
    }
  }

  // Dots follow the row height, so a short canvas (phones) stays legible.
  const dot = time ? Math.max(1.6, Math.min(2.8, layout.rowHeight * 0.3)) : 0
  if (time) {
    for (const key of state.settled) {
      const p = layout.point(key)
      if (!p) continue
      ctx.fillStyle = colourOf(state.best.get(key)!.cents)
      ctx.beginPath()
      ctx.arc(p.x, p.y, dot, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.lineWidth = 1.4
    ctx.strokeStyle = palette.origin
    for (const key of state.open) {
      const p = layout.point(key)
      if (!p) continue
      ctx.beginPath()
      ctx.arc(p.x, p.y, dot + 0.9, 0, Math.PI * 2)
      ctx.stroke()
    }
  } else {
    const frontier = new Set([...state.open].map(airportOfKey))
    ctx.font = '700 10px "JetBrains Mono Variable", ui-monospace, monospace'
    ctx.textBaseline = 'middle'
    for (const [code, p] of layout.airports) {
      const reached = state.reached.get(code)
      if (reached) {
        ctx.fillStyle = colourOf(reached.cents)
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4.6, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = palette.text
        ctx.fillText(code, p.x + 7, p.y - 7)
      } else if (frontier.has(code)) {
        ctx.strokeStyle = palette.origin
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  // The step being taken: its node pulses, its edges light up.
  const current = state.current
  if (current && !(state.finished && trace.path)) {
    ctx.save()
    for (const edge of current.relaxed) {
      ctx.setLineDash(edge.improved ? [] : [3, 4])
      ctx.strokeStyle = edge.improved
        ? palette.connection
        : rgba(palette.text, 0.35)
      ctx.lineWidth = edge.improved ? 2.2 : 1.2
      ctx.shadowColor = edge.improved ? palette.connection : 'transparent'
      ctx.shadowBlur = edge.improved ? 8 : 0
      if (edgePath(ctx, layout, current.node, edge.to, edge.flight))
        ctx.stroke()
    }
    ctx.restore()
    const p = layout.point(current.node)
    if (p) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 180)
      ctx.fillStyle = rgba(palette.destination, 0.18 + 0.12 * pulse)
      ctx.beginPath()
      ctx.arc(p.x, p.y, 9 + 4 * pulse, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = palette.destination
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // The cheapest route, once found.
  if (state.finished && trace.path) {
    const path = trace.path
    const flightTo = new Map<string, Flight | null>()
    for (let i = 1; i < path.length; i += 1) {
      flightTo.set(path[i], state.parent.get(path[i])?.flight ?? null)
    }
    ctx.save()
    for (const [width, colour, blur] of [
      [7, rgba(palette.accent, 0.35), 16],
      [3.2, palette.destination, 0],
      [1.2, rgba('#ffffff', 0.85), 0],
    ] as const) {
      ctx.lineWidth = width
      ctx.strokeStyle = colour
      ctx.shadowColor = blur ? palette.accent : 'transparent'
      ctx.shadowBlur = blur
      for (let i = 1; i < path.length; i += 1) {
        if (
          edgePath(ctx, layout, path[i - 1], path[i], flightTo.get(path[i])!)
        ) {
          ctx.stroke()
        }
      }
    }
    ctx.restore()
    const ends = [path[0], path[path.length - 1]]
    ends.forEach((key, index) => {
      const p = layout.point(key)
      if (!p) return
      ctx.fillStyle = index === 0 ? palette.origin : palette.destination
      ctx.beginPath()
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = rgba('#ffffff', 0.9)
      ctx.stroke()
    })
  }

  if (hover) {
    const p = time ? layout.point(hover) : layout.airports.get(hover)
    if (p) {
      ctx.lineWidth = 2
      ctx.strokeStyle = palette.text
      ctx.beginPath()
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}
