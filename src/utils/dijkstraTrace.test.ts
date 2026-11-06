import { describe, expect, it } from 'vitest'
import network from '../data/sample-network.json'
import type { Flight } from '../types/route'
import { cheapestRoute, traceCheapestRoute } from './cheapestRoute'
import { airportOfKey, queueOrder, replay } from './dijkstraTrace'

const flights = network.flights as Flight[]

describe('traceCheapestRoute', () => {
  it.each([
    { origin: 'GRU', destination: 'GIG' },
    { origin: 'POA', destination: 'LHR' },
    { origin: 'GRU', destination: 'JNB' },
    { origin: 'MAO', destination: 'MAD', departureDate: '2027-01-01' },
  ])(
    'finds the same route as cheapestRoute: $origin → $destination',
    (search) => {
      const { route, trace } = traceCheapestRoute(flights, search)

      expect(route).toEqual(cheapestRoute(flights, search))
      // The recorded path runs from the start node to a destination node.
      expect(trace.path?.[0]).toBe(trace.start)
      expect(airportOfKey(trace.path!.at(-1)!)).toBe(search.destination)
      // The last node taken from the queue is the destination, at the price.
      const last = trace.steps.at(-1)!
      expect(airportOfKey(last.node)).toBe(search.destination)
      expect(last.cents / 100).toBe(route!.price)
    },
  )

  it('records a search that finds no route', () => {
    const search = {
      origin: 'GRU',
      destination: 'JFK',
      departureDate: '2027-01-01',
      returnDate: '2027-01-31',
    }

    const { route, trace } = traceCheapestRoute(flights, search)

    expect(route).toBeNull()
    expect(trace.path).toBeNull()
    expect(trace.steps.length).toBeGreaterThan(0)
  })

  it('starts empty when the origin has no flight in the period', () => {
    const { trace } = traceCheapestRoute(flights, {
      origin: 'GRU',
      destination: 'JFK',
      departureDate: '2027-05-01',
    })

    expect(trace.start).toBeNull()
    expect(trace.steps).toEqual([])
  })
})

describe('replay', () => {
  const { trace } = traceCheapestRoute(flights, {
    origin: 'POA',
    destination: 'LHR',
  })

  it('starts with only the start node in the queue', () => {
    const state = replay(trace, -1)

    expect([...state.open]).toEqual([trace.start])
    expect(state.settled.size).toBe(0)
    expect(state.current).toBeNull()
  })

  it('settles one node per step, in the order of its labels', () => {
    let previous = -1
    for (let step = 0; step < trace.steps.length; step += 1) {
      const state = replay(trace, step)
      expect(state.settled.size).toBe(step + 1)
      // Dijkstra takes nodes in non-decreasing price.
      expect(state.current!.cents).toBeGreaterThanOrEqual(previous)
      previous = state.current!.cents
    }
  })

  it('ends on the destination, with the path in the tree', () => {
    const state = replay(trace, trace.steps.length - 1)

    expect(state.finished).toBe(true)
    for (const node of trace.path!.slice(1)) {
      expect(state.parent.has(node)).toBe(true)
    }
    expect(state.reached.get('LHR')?.node).toBe(trace.path!.at(-1))
  })

  it('orders the queue the way Dijkstra takes it', () => {
    const state = replay(trace, 40)
    const prices = queueOrder(state).map((key) => state.best.get(key)!.cents)

    expect(prices).toEqual([...prices].sort((a, b) => a - b))
    // The head of the queue is the next node taken.
    expect(queueOrder(state)[0]).toBe(trace.steps[41].node)
  })
})
