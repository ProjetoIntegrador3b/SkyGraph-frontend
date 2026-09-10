import type { FormEvent } from 'react'
import DateRangePicker from './DateRangePicker'

interface RouteSearchFormProps {
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

export default function RouteSearchForm({
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
      <div className="field">
        <label htmlFor="origin">Origem</label>
        <input
          id="origin"
          name="origin"
          placeholder="Ex.: GRU"
          value={origin}
          onChange={(event) => onOriginChange(event.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="destination">Destino</label>
        <input
          id="destination"
          name="destination"
          placeholder="Ex.: JFK"
          value={destination}
          onChange={(event) => onDestinationChange(event.target.value)}
          required
        />
      </div>

      <DateRangePicker
        departureDate={departureDate}
        returnDate={returnDate}
        onDepartureDateChange={onDepartureDateChange}
        onReturnDateChange={onReturnDateChange}
      />

      {departureDate && returnDate && (
        <p className="date-range-summary" role="status">
          Período selecionado: {departureDate} → {returnDate}
        </p>
      )}

      <button type="submit" disabled={loading}>
        {loading ? (
          <>
            <span className="button-flight-loader" aria-hidden="true">
              <span className="button-flight-loader__plane">✈</span>
            </span>
            Buscando voos...
          </>
        ) : (
          'Buscar melhores rotas'
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
            Procurando as melhores rotas
            <span className="loading-dots" aria-hidden="true">
              ...
            </span>
          </span>
        </div>
      )}
    </form>
  )
}
