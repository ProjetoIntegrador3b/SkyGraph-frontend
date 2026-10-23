import { useMemo, useState, type KeyboardEvent } from 'react'
import type { Airport } from '../types/airport'

interface AirportSelectProps {
  id: string
  label: string
  placeholder: string
  value: string
  airports: Airport[]
  onChange: (value: string) => void
}

function airportLabel(airport: Airport) {
  return `${airport.country} - ${airport.code} - ${airport.name}`
}

// Lower case without accents, so "sao paulo" finds "São Paulo".
function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

const byCountryThenCode = (a: Airport, b: Airport) =>
  a.country.localeCompare(b.country, 'pt-BR') || a.code.localeCompare(b.code)

function matching(airports: Airport[], query: string) {
  const sorted = [...airports].sort(byCountryThenCode)
  const wanted = normalize(query)
  if (!wanted) return sorted

  const matches = sorted.filter((airport) =>
    normalize(
      `${airport.code} ${airport.name} ${airport.city} ${airport.country}`,
    ).includes(wanted),
  )
  // Codes that start with what was typed come first.
  const startsWithCode = (airport: Airport) =>
    normalize(airport.code).startsWith(wanted) ? 0 : 1
  return matches.sort((a, b) => startsWithCode(a) - startsWithCode(b))
}

// A combobox: the field holds the airport code the search sends, and the list
// suggests airports as "country - code - name". Typing a code still works.
export default function AirportSelect({
  id,
  label,
  placeholder,
  value,
  airports,
  onChange,
}: AirportSelectProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const options = useMemo(() => matching(airports, value), [airports, value])
  const listId = `${id}-options`
  const showList = open && options.length > 0

  function choose(airport: Airport) {
    onChange(airport.code)
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        setActive(0)
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (current + step + options.length) % options.length)
    } else if (event.key === 'Enter' && showList) {
      // Pick the highlighted airport instead of submitting the form.
      event.preventDefault()
      choose(options[Math.min(active, options.length - 1)])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="field airport-select">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={
          showList ? `${listId}-${options[active]?.code}` : undefined
        }
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        required
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="airport-options"
          aria-label={label}
        >
          {options.map((airport, index) => (
            <li
              key={airport.code}
              id={`${listId}-${airport.code}`}
              role="option"
              aria-selected={index === active}
              className="airport-option"
              // mousedown, not click: it fires before the input's blur closes
              // the list, and preventDefault keeps the focus in the field.
              onMouseDown={(event) => {
                event.preventDefault()
                choose(airport)
              }}
              onMouseEnter={() => setActive(index)}
            >
              {airportLabel(airport)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
