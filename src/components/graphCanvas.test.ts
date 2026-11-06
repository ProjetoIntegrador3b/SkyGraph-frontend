import { describe, expect, it } from 'vitest'
import {
  clampZoom,
  MAX_ZOOM,
  NO_ZOOM,
  panBy,
  zoomAround,
  type MapZoom,
} from './graphCanvas'

const WIDTH = 800
const HEIGHT = 500

// Where a map point (at zoom 1) lands on the stage with `zoom`.
const onStage = (zoom: MapZoom, x: number, y: number) => ({
  x: x * zoom.scale + zoom.x,
  y: y * zoom.scale + zoom.y,
})

describe('map zoom', () => {
  it('keeps the point under the pointer where it is', () => {
    const zoom = zoomAround(NO_ZOOM, 2, 300, 200, WIDTH, HEIGHT)

    expect(zoom.scale).toBe(2)
    expect(onStage(zoom, 300, 200)).toEqual({ x: 300, y: 200 })

    // Again from a zoomed-in map, at another point.
    const closer = zoomAround(zoom, 1.5, 500, 100, WIDTH, HEIGHT)
    const before = {
      x: (500 - zoom.x) / zoom.scale,
      y: (100 - zoom.y) / zoom.scale,
    }
    expect(onStage(closer, before.x, before.y).x).toBeCloseTo(500)
    expect(onStage(closer, before.x, before.y).y).toBeCloseTo(100)
  })

  it('stays between the whole map and 8×', () => {
    expect(zoomAround(NO_ZOOM, 0.5, 300, 200, WIDTH, HEIGHT)).toEqual(NO_ZOOM)
    expect(zoomAround(NO_ZOOM, 100, 300, 200, WIDTH, HEIGHT).scale).toBe(
      MAX_ZOOM,
    )
  })

  it('never uncovers an empty band at an edge', () => {
    const zoom = zoomAround(NO_ZOOM, 2, 0, 0, WIDTH, HEIGHT)

    // Panning right or down past the map's edge stops at it.
    expect(panBy(zoom, 1000, 1000, WIDTH, HEIGHT)).toEqual({
      scale: 2,
      x: 0,
      y: 0,
    })
    // And the other way: the map's far edge stays on the stage's.
    expect(panBy(zoom, -5000, -5000, WIDTH, HEIGHT)).toEqual({
      scale: 2,
      x: WIDTH - WIDTH * 2,
      y: HEIGHT - HEIGHT * 2,
    })
  })

  it('fits a zoom made for a larger stage', () => {
    // After the window shrinks, the same zoom still covers the stage.
    const zoom = { scale: 2, x: -1500, y: -900 }

    expect(clampZoom(zoom, 400, 300)).toEqual({ scale: 2, x: -400, y: -300 })
  })
})
