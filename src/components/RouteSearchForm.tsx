import type { FormEvent } from 'react'
import type { Airport } from '../types/airport'
import { formatDay } from '../utils/dates'
import AirportSelect from './AirportSelect'
import DateRangePicker from './DateRangePicker'

interface RouteSearchFormProps {
  airports: Airport[]
  origin: string
  destination: string
  departureDate: string
  returnDate: string
  loading: boolean
  onOriginChange: (value: string) => void
  onDestinationChange: (value: string) => void
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
  onDepartureDateChange,
  onReturnDateChange,
  onSubmit,
}: RouteSearchFormProps) {
  return (
    <form className="route-search-form" onSubmit={onSubmit}>
      <AirportSelect
        id="origin"
        label="Origem"
        placeholder="Ex.: GRU ou São Paulo"
        value={origin}
        airports={airports}
        onChange={onOriginChange}
      />

      <AirportSelect
        id="destination"
        label="Destino"
        placeholder="Ex.: JFK ou Nova York"
        value={destination}
        airports={airports}
        onChange={onDestinationChange}
      />

      <DateRangePicker
        departureDate={departureDate}
        returnDate={returnDate}
        onDepartureDateChange={onDepartureDateChange}
        onReturnDateChange={onReturnDateChange}
      />

      <p className="date-range-summary" role="status">
        {describePeriod(departureDate, returnDate)}
      </p>

      <button type="submit" disabled={loading}>
        {loading ? (
          <>
            <span className="button-flight-loader" aria-hidden="true">
              <span className="button-flight-loader__plane">✈</span>
            </span>
            Buscando voos...
          </>
        ) : (
          'Buscar melhor rota'
        )}
      </button>
      {loading && (
        <div className="flight-loading" role="status" aria-live="polite">
          <div className="flight-loading__sky" aria-hidden="true">
            <span className="flight-loading__cloud flight-loading__cloud--one" />
            <span className="flight-loading__cloud flight-loading__cloud--two" />
            <span className="flight-loading__trail" />
            <span className="flight-loading__plane">✈</span>
          </div>
          <span>
            Procurando a melhor rota
            <span className="loading-dots" aria-hidden="true">
              ...
            </span>
          </span>
        </div>
      )}
    </form>
  )
}
