import type { FormEvent } from 'react'
import type { Airport } from '../types/airport'
import { formatDay } from '../utils/dates'
import AirportSelect from './AirportSelect'
import DateRangePicker from './DateRangePicker'
import {
  ArrowRightIcon,
  CalendarIcon,
  LandingIcon,
  SwapIcon,
  TakeoffIcon,
} from './icons'

interface RouteSearchFormProps {
  airports: Airport[]
  origin: string
  destination: string
  departureDate: string
  returnDate: string
  loading: boolean
  onOriginChange: (value: string) => void
  onDestinationChange: (value: string) => void
  onSwap: () => void
  onDepartureDateChange: (value: string) => void
  onReturnDateChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function describePeriod(departureDate: string, returnDate: string) {
  if (departureDate && returnDate) {
    return `Voos entre ${formatDay(departureDate)} e ${formatDay(returnDate)}`
  }
  if (departureDate) return `Voos a partir de ${formatDay(departureDate)}`
  if (returnDate) return `Voos com chegada até ${formatDay(returnDate)}`
  return 'Sem datas: a busca considera todos os voos'
}

export default function RouteSearchForm({
  airports,
  origin,
  destination,
  departureDate,
  returnDate,
  loading,
  onOriginChange,
  onDestinationChange,
  onSwap,
  onDepartureDateChange,
  onReturnDateChange,
  onSubmit,
}: RouteSearchFormProps) {
  return (
    <form className="route-search-form" onSubmit={onSubmit}>
      <div className="search-bar">
        <div className="search-bar__airports">
          <AirportSelect
            id="origin"
            label="Origem"
            icon={<TakeoffIcon />}
            placeholder="GRU ou São Paulo"
            value={origin}
            airports={airports}
            onChange={onOriginChange}
          />

          <button
            className="swap-button"
            type="button"
            onClick={onSwap}
            disabled={!origin && !destination}
            aria-label="Inverter origem e destino"
            title="Inverter origem e destino"
          >
            <SwapIcon />
          </button>

          <AirportSelect
            id="destination"
            label="Destino"
            icon={<LandingIcon />}
            placeholder="JFK ou Nova York"
            value={destination}
            airports={airports}
            onChange={onDestinationChange}
          />
        </div>

        <DateRangePicker
          departureDate={departureDate}
          returnDate={returnDate}
          onDepartureDateChange={onDepartureDateChange}
          onReturnDateChange={onReturnDateChange}
        />

        <button className="submit-button" type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Buscando voos...
            </>
          ) : (
            <>
              Buscar melhor rota
              <ArrowRightIcon className="submit-button__arrow" />
            </>
          )}
        </button>
      </div>

      <div className="search-meta">
        <p className="date-range-summary" role="status">
          <CalendarIcon className="date-range-summary__icon" />
          {describePeriod(departureDate, returnDate)}
        </p>

        {loading && (
          <div className="flight-loading" role="status" aria-live="polite">
            <span className="flight-loading__track" aria-hidden="true">
              <span className="flight-loading__dot" />
            </span>
            <span>
              Procurando a melhor rota
              <span className="loading-dots" aria-hidden="true">
                ...
              </span>
            </span>
          </div>
        )}
      </div>
    </form>
  )
}
