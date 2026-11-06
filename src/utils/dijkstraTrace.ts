import type { Flight } from '../types/route'

// What the cheapest-route search records for the graph explorer: the
// time-expanded graph it ran on, and every step it took.

export interface TraceNode {
  // "AIRPORT|YYYY-MM-DD"
  key: string
  airport: string
  day: string
}

export interface TraceRelax {
  to: string
  // The flight taken, or null for a wait at the same airport.
  flight: Flight | null
  cents: number
  flights: number
  // Whether this edge gave `to` a better label than it had.
  improved: boolean
}

export interface TraceStep {
  // The node taken from the priority queue, with its final label.
  node: string
  cents: number
  flights: number
  relaxed: TraceRelax[]
}

export interface DijkstraTrace {
  origin: string
  destination: string
  nodes: TraceNode[]
  flights: Flight[]
  waits: { from: string; to: string }[]
  // Null when the origin has no flight in the period.
  start: string | null
  steps: TraceStep[]
  // The nodes of the cheapest route, waits included; null when none exists.
  path: string[] | null
}

export interface Label {
  cents: number
  flights: number
}

// The search as it stood after `step` (-1: before the first node is taken).
export interface TraceState {
  step: number
  current: TraceStep | null
  settled: Set<string>
  open: Set<string>
  best: Map<string, Label>
  // How each reached node was reached: the tree Dijkstra grows.
  parent: Map<string, { from: string; flight: Flight | null }>
  relaxations: number
  improvements: number
  // The first node settled at each airport: the cheapest way to get there.
  reached: Map<string, { node: string; step: number; cents: number }>
  finished: boolean
}

export const dayOf = (key: string) => key.slice(key.indexOf('|') + 1)
export const airportOfKey = (key: string) => key.slice(0, key.indexOf('|'))

export function replay(trace: DijkstraTrace, step: number): TraceState {
  const settled = new Set<string>()
  const open = new Set<string>()
  const best = new Map<string, Label>()
  const parent: TraceState['parent'] = new Map()
  const reached: TraceState['reached'] = new Map()
  let relaxations = 0
  let improvements = 0

  if (trace.start) {
    open.add(trace.start)
    best.set(trace.start, { cents: 0, flights: 0 })
  }

  const last = Math.min(step, trace.steps.length - 1)
  for (let index = 0; index <= last; index += 1) {
    const { node, cents, relaxed } = trace.steps[index]
    open.delete(node)
    settled.add(node)
    const airport = airportOfKey(node)
    if (!reached.has(airport))
      reached.set(airport, { node, step: index, cents })
    for (const edge of relaxed) {
      relaxations += 1
      if (!edge.improved) continue
      improvements += 1
      best.set(edge.to, { cents: edge.cents, flights: edge.flights })
      parent.set(edge.to, { from: node, flight: edge.flight })
      open.add(edge.to)
    }
  }

  return {
    step: last,
    current: last >= 0 ? trace.steps[last] : null,
    settled,
    open,
    best,
    parent,
    relaxations,
    improvements,
    reached,
    finished: last === trace.steps.length - 1,
  }
}

// The open nodes in the order Dijkstra takes them: price, flights, day.
export function queueOrder(state: TraceState): string[] {
  return [...state.open].sort((a, b) => {
    const la = state.best.get(a)!
    const lb = state.best.get(b)!
    return (
      la.cents - lb.cents ||
      la.flights - lb.flights ||
      dayOf(a).localeCompare(dayOf(b))
    )
  })
}
