// Decorative hero art: a small flight network drawn from real airports in the
// data set, placed by longitude and latitude, with one cheapest route lit up.

type Code = keyof typeof places

const places = {
  JFK: [-73.8, 40.6],
  MIA: [-80.3, 25.8],
  MEX: [-99.1, 19.4],
  BOG: [-74.1, 4.7],
  FOR: [-38.5, -3.8],
  GRU: [-46.5, -23.4],
  EZE: [-58.5, -34.8],
  SCL: [-70.8, -33.4],
  LIS: [-9.1, 38.8],
  LHR: [-0.5, 51.5],
  JNB: [28.0, -26.1],
  DXB: [55.4, 25.3],
} as const

const edges: [Code, Code][] = [
  ['JFK', 'MIA'],
  ['MIA', 'BOG'],
  ['MEX', 'BOG'],
  ['MEX', 'MIA'],
  ['BOG', 'FOR'],
  ['BOG', 'GRU'],
  ['SCL', 'BOG'],
  ['EZE', 'SCL'],
  ['LIS', 'LHR'],
  ['LHR', 'JFK'],
  ['LHR', 'DXB'],
  ['GRU', 'JNB'],
  ['JNB', 'DXB'],
  ['MIA', 'LIS'],
]

// The highlighted cheapest route.
const route: Code[] = ['EZE', 'GRU', 'FOR', 'LIS']

// Equirectangular projection into the 480 × 360 view box.
function point(code: Code) {
  const [lon, lat] = places[code]
  return { x: (lon + 110) * 2.7, y: (60 - lat) * 3.4 }
}

// A gentle arc, bowed to the left of travel like a flight path on a map.
function arcPath(from: Code, to: Code, start = true) {
  const a = point(from)
  const b = point(to)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const bow = 0.18
  const cx = (a.x + b.x) / 2 + dy * bow
  const cy = (a.y + b.y) / 2 - dx * bow
  const head = start ? `M${a.x.toFixed(1)} ${a.y.toFixed(1)} ` : ''
  return `${head}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
}

const routePath = route
  .slice(1)
  .map((code, index) => arcPath(route[index], code, index === 0))
  .join(' ')

function role(code: Code) {
  if (code === route[0]) return 'origin'
  if (code === route[route.length - 1]) return 'destination'
  return route.includes(code) ? 'connection' : 'idle'
}

export default function NetworkArt({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 480 360"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="network-route" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--role-origin)' }} />
          <stop offset=".55" style={{ stopColor: 'var(--role-connection)' }} />
          <stop offset="1" style={{ stopColor: 'var(--role-destination)' }} />
        </linearGradient>
      </defs>

      <g className="network__edges">
        {edges.map(([from, to]) => (
          <path key={`${from}-${to}`} d={arcPath(from, to)} />
        ))}
      </g>

      <path className="network__route-glow" d={routePath} />
      <path
        className="network__route"
        d={routePath}
        stroke="url(#network-route)"
      />

      <g className="network__plane">
        <circle r="4.5" />
        <animateMotion dur="7s" repeatCount="indefinite" path={routePath} />
      </g>

      {(Object.keys(places) as Code[]).map((code) => {
        const { x, y } = point(code)
        const kind = role(code)
        return (
          <g key={code} className={`network__node network__node--${kind}`}>
            {kind !== 'idle' && (
              <circle className="network__halo" cx={x} cy={y} r="11" />
            )}
            <circle cx={x} cy={y} r={kind === 'idle' ? 3 : 5} />
            <text x={x + 9} y={y + 4}>
              {code}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
