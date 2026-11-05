import { useId } from 'react'

interface LogoMarkProps {
  className?: string
}

// The SkyGraph mark: a flight path drawn as an S through three graph nodes,
// origin → connection → destination, in the colours the globe uses for them.
// Colours come from CSS variables, so the mark follows the theme.
export function LogoMark({ className }: LogoMarkProps) {
  // SVG ids are global to the document; keep each instance's own.
  const id = useId().replace(/[^\w-]/g, '')
  const route = `${id}-route`
  const hub = `${id}-hub`

  return (
    <svg
      className={className}
      viewBox="9 5 43 51"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={route}
          x1="16"
          y1="50"
          x2="46"
          y2="14"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" style={{ stopColor: 'var(--role-origin)' }} />
          <stop offset=".5" style={{ stopColor: 'var(--role-connection)' }} />
          <stop offset="1" style={{ stopColor: 'var(--role-destination)' }} />
        </linearGradient>
        <mask id={hub}>
          <rect x="0" y="0" width="64" height="64" fill="#fff" />
          <circle cx="32" cy="32" r="6" fill="#000" />
        </mask>
      </defs>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path
          mask={`url(#${hub})`}
          stroke={`url(#${route})`}
          strokeWidth="5.5"
          d="M16 49C32 49 45 47 45 40S37 32 32 32 19 31 19 24 30 15 42 15"
        />
        <path
          style={{ stroke: 'var(--role-destination)' }}
          strokeWidth="5.5"
          d="M39 9.5 47 15 39 20.5"
        />
        <circle
          cx="32"
          cy="32"
          r="5.2"
          style={{ stroke: 'var(--role-connection)' }}
          strokeWidth="3.6"
        />
        <circle
          cx="16"
          cy="49"
          r="5.2"
          style={{ fill: 'var(--role-origin)' }}
        />
      </g>
    </svg>
  )
}

export default function Logo() {
  return (
    <a className="logo" href="/home" aria-label="SkyGraph - início">
      <LogoMark className="logo__mark" />
      <span className="logo__word" aria-hidden="true">
        <span className="logo__sky">Sky</span>
        <span className="logo__graph">Graph</span>
      </span>
    </a>
  )
}
