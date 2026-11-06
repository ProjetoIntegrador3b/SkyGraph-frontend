import type { SVGProps } from 'react'

// A small, consistent line-icon set (24px grid, 1.8 stroke). Decorative:
// every icon is hidden from assistive technology; the control names itself.
type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

const PLANE =
  'M21 12c0-.8-.7-1.4-1.5-1.4h-4.7L10 3.5H8l2.4 7.1H5.6L4 8.5H2.5l1 3.5-1 3.5H4l1.6-2.1h4.8L8 20.5h2l4.8-7.1h4.7c.8 0 1.5-.6 1.5-1.4Z'

export function PlaneIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d={PLANE} />
    </Icon>
  )
}

export function TakeoffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d={PLANE}
        transform="translate(0 -1.5) rotate(-28 12 12) scale(.9)"
      />
      <path d="M3 21.5h18" />
    </Icon>
  )
}

export function LandingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d={PLANE}
        transform="translate(1.5 -1) rotate(28 12 12) scale(.9)"
      />
      <path d="M3 21.5h18" />
    </Icon>
  )
}

export function SwapIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 4 3 8l4 4" />
      <path d="M3 8h13" />
      <path d="m17 12 4 4-4 4" />
      <path d="M21 16H8" />
    </Icon>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Icon>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </Icon>
  )
}

export function ChevronIcon(
  props: IconProps & { direction: 'left' | 'right' },
) {
  const { direction, ...rest } = props
  return (
    <Icon {...rest}>
      <path d={direction === 'left' ? 'm15 5-7 7 7 7' : 'm9 5 7 7-7 7'} />
    </Icon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </Icon>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </Icon>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </Icon>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 5.5v13l10.5-6.5Z" fill="currentColor" />
    </Icon>
  )
}

export function PauseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.5 5.5v13M15.5 5.5v13" strokeWidth="2.6" />
    </Icon>
  )
}

export function SkipIcon(props: IconProps & { direction: 'back' | 'forward' }) {
  const { direction, ...rest } = props
  return (
    <Icon {...rest}>
      {direction === 'back' ? (
        <path d="M6 5v14M18 6l-8 6 8 6Z" />
      ) : (
        <path d="M18 5v14M6 6l8 6-8 6Z" />
      )}
    </Icon>
  )
}

// Three nodes and their edges: the "see the graph" button.
export function GraphIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 7.8 16 6.4M6.6 9.4l4 7.3M17.4 8.6l-4.6 8.2" />
      <circle cx="5.5" cy="7.5" r="2.5" />
      <circle cx="18.5" cy="6" r="2.5" />
      <circle cx="12" cy="18.5" r="2.5" />
    </Icon>
  )
}
