import { useEffect, useRef, useState, type FormEvent } from 'react'
import RouteCard from '../components/RouteCard'
import RouteSearchForm from '../components/RouteSearchForm'
import { searchRoutes } from '../services/routes'
import type { RouteSearchResponse } from '../types/route'

export default function Home() {
  const [darkMode, setDarkMode] = useState(
    () => window.localStorage.getItem('skygraph-theme') !== 'light',
  )
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [results, setResults] = useState<RouteSearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const resultsRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (
      results &&
      resultsRef.current &&
      typeof resultsRef.current.scrollIntoView === 'function'
    ) {
      resultsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }, [results])

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current
      window.localStorage.setItem('skygraph-theme', next ? 'dark' : 'light')
      return next
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    if (!departureDate || !returnDate) {
      setError('Selecione as datas de ida e volta para continuar.')
      setLoading(false)
      return
    }

    if (returnDate < departureDate) {
      setError('A data de volta deve ser igual ou posterior à data de ida.')
      setLoading(false)
      return
    }

    try {
      const response = await searchRoutes({
        origin: origin.trim().toUpperCase(),
        destination: destination.trim().toUpperCase(),
        departureDate,
        returnDate,
      })
      setResults(response)
    } catch (requestError) {
      setResults(null)
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Ocorreu um erro ao buscar as rotas.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={`page-shell ${darkMode ? 'theme-dark' : 'theme-light'}`}>
      <div className="ambient-glow ambient-glow--one" />
      <div className="ambient-glow ambient-glow--two" />
      <header className="topbar">
        <a className="brand" href="/home" aria-label="SkyGraph - início">
          <span className="brand__mark" aria-hidden="true">
            ✦
          </span>
          <span>
            <strong>SKY</strong>GRAPH
          </span>
        </a>
        <button
          className="theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo noturno'}
        >
          <span aria-hidden="true">{darkMode ? '☀' : '☾'}</span>
          {darkMode ? 'Modo claro' : 'Modo noturno'}
        </button>
      </header>
      <section className="hero" aria-labelledby="page-title">
        <div className="hero__route-line" aria-hidden="true">
          <span />
          <span className="hero__plane">✈</span>
          <span />
        </div>
        <p className="eyebrow">Planeje com inteligência</p>
        <h1 id="page-title">Encontre a melhor rota para sua viagem</h1>
        <p className="hero__description">
          Conecte aeroportos e descubra a rota mais barata para o seu próximo
          destino.
        </p>

        <RouteSearchForm
          origin={origin}
          destination={destination}
          departureDate={departureDate}
          returnDate={returnDate}
          loading={loading}
          onOriginChange={setOrigin}
          onDestinationChange={setDestination}
          onDepartureDateChange={setDepartureDate}
          onReturnDateChange={setReturnDate}
          onSubmit={handleSubmit}
        />

        {error && (
          <p className="feedback feedback--error" role="alert">
            {error}
          </p>
        )}
      </section>

      {results && (
        <section
          className="results"
          aria-labelledby="results-title"
          ref={resultsRef}
        >
          <div className="results__heading">
            <p className="eyebrow">Resultado</p>
            <h2 id="results-title">
              Rota de {origin.trim().toUpperCase()} para{' '}
              {destination.trim().toUpperCase()}
            </h2>
          </div>

          <div className="route-grid">
            <RouteCard route={results.route} />
          </div>
        </section>
      )}
    </main>
  )
}
