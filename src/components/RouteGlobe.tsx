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
  color: '#0d1430',
  emissive: '#060918',
  shininess: 8,
})

// The same roles, in the same colours, as the logo and the hero art.
const stopColours: Record<GlobeStop['role'], string> = {
  origin: '#7cc4ff',
  connection: '#ffc857',
  destination: '#ff6b3d',
}

const legend: [GlobeStop['role'], string][] = [
  ['origin', 'Origem'],
  ['connection', 'Conexão'],
  ['destination', 'Destino'],
]

// Height follows the width on narrow screens, so on a phone the globe leaves
// room to scroll past it: dragging on the globe rotates it instead.
const MAX_HEIGHT = 420

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
            height={Math.min(MAX_HEIGHT, Math.round(width * 0.85))}
            backgroundColor="rgba(0,0,0,0)"
            globeMaterial={oceanMaterial}
            showAtmosphere
            atmosphereColor="#7cc4ff"
            atmosphereAltitude={0.18}
            polygonsData={countries}
            polygonCapColor={() => '#1c2547'}
            polygonSideColor={() => 'rgba(28, 37, 71, 0.6)'}
            polygonStrokeColor={() => '#34406e'}
            polygonAltitude={0.004}
            arcsData={geometry.arcs}
            arcColor={() => [stopColours.origin, stopColours.destination]}
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
            labelColor={() => '#eef0f8'}
            labelAltitude={0.03}
            labelResolution={3}
          />
        )}
      </div>
      <div className="route-globe__footer">
        <ul className="route-globe__legend" aria-label="Legenda do mapa">
          {legend.map(([role, label]) => (
            <li key={role}>
              <span
                className="route-globe__swatch"
                style={{ background: stopColours[role] }}
              />
              {label}
            </li>
          ))}
        </ul>
        <p className="route-globe__hint">
          Arraste para girar · role ou use o gesto de pinça para aproximar
        </p>
      </div>
    </section>
  )
}
