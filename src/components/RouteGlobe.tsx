import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { MeshPhongMaterial } from 'three'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import countriesTopology from 'world-atlas/countries-110m.json'
import type { Airport } from '../types/airport'
import type { RouteResult } from '../types/route'
import { routeGeometry, type GlobeStop } from '../utils/routeGeometry'

interface RouteGlobeProps {
  route: RouteResult
  airports: Airport[]
}

// Country outlines bundled with the app, so the globe needs no remote images.
const topology = countriesTopology as unknown as Topology<{
  countries: GeometryCollection
}>
const countries = feature(topology, topology.objects.countries).features

const oceanMaterial = new MeshPhongMaterial({
  color: '#0b1d33',
  emissive: '#06101f',
  shininess: 8,
})

const stopColours: Record<GlobeStop['role'], string> = {
  origin: '#53c9c0',
  connection: '#f5c26b',
  destination: '#ff7a8a',
}

const HEIGHT = 420

// A 3D globe with the route's airports and one animated arc per leg. Drag to
// rotate, scroll or pinch to zoom. Loaded on demand: three.js is large.
export default function RouteGlobe({ route, airports }: RouteGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeMethods>(undefined)
  const [width, setWidth] = useState(0)
  const geometry = useMemo(
    () => routeGeometry(route, airports),
    [route, airports],
  )

  // The globe needs a pixel width; follow the container's.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Fly to the route whenever it changes.
  useEffect(() => {
    if (geometry && width > 0) {
      globeRef.current?.pointOfView(geometry.view, 1200)
    }
  }, [geometry, width])

  if (!geometry) return null

  // Labels and markers are sized in degrees on the globe, so they shrink as
  // the camera backs off; scale them with its height to stay readable.
  const scale = geometry.view.altitude / 1.3

  return (
    <section className="route-globe" aria-label="Mapa 3D da rota">
      <div className="route-globe__canvas" ref={containerRef}>
        {width > 0 && (
          <Globe
            ref={globeRef}
            width={width}
            height={HEIGHT}
            backgroundColor="rgba(0,0,0,0)"
            globeMaterial={oceanMaterial}
            showAtmosphere
            atmosphereColor="#53c9c0"
            atmosphereAltitude={0.18}
            polygonsData={countries}
            polygonCapColor={() => '#1d3a55'}
            polygonSideColor={() => 'rgba(29, 58, 85, 0.6)'}
            polygonStrokeColor={() => '#2f5677'}
            polygonAltitude={0.004}
            arcsData={geometry.arcs}
            arcColor={() => ['#53c9c0', '#ff7a8a']}
            arcStroke={1.4}
            arcAltitudeAutoScale={0.5}
            arcDashLength={0.5}
            arcDashGap={0.15}
            arcDashAnimateTime={2200}
            arcLabel={(arc: object) => (arc as { label: string }).label}
            pointsData={geometry.stops}
            pointLat="lat"
            pointLng="lng"
            pointColor={(stop: object) => stopColours[(stop as GlobeStop).role]}
            pointAltitude={0.02}
            pointRadius={0.7 * scale}
            pointLabel={(stop: object) => {
              const { code, city } = stop as GlobeStop
              return `${code} · ${city}`
            }}
            labelsData={geometry.stops}
            labelLat="lat"
            labelLng="lng"
            labelText="code"
            labelSize={1.4 * scale}
            labelDotRadius={0}
            labelColor={() => '#edf6ff'}
            labelAltitude={0.03}
            labelResolution={3}
          />
        )}
      </div>
      <p className="route-globe__hint">
        Arraste para girar · role ou use o gesto de pinça para aproximar
      </p>
    </section>
  )
}
