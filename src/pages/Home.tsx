import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react'
import GlobeBoundary from '../components/GlobeBoundary'
import { AlertIcon, GraphIcon, MoonIcon, SunIcon } from '../components/icons'
import Logo from '../components/Logo'
import NetworkArt from '../components/NetworkArt'
import RouteCard from '../components/RouteCard'
import RouteSearchForm from '../components/RouteSearchForm'
import { fetchAirports } from '../services/airports'
import { isUsingSampleData, subscribeToSampleData } from '../services/api'
import { searchRoutes } from '../services/routes'
import type { Airport } from '../types/airport'
import type { RouteSearchRequest, RouteSearchResponse } from '../types/route'

// three.js is large, so the globe downloads only once a route is found.
const RouteGlobe = lazy(() => import('../components/RouteGlobe'))
// The step-by-step replay of the search, loaded when it is opened.
const GraphExplorer = lazy(() => import('../components/GraphExplorer'))

const themeColours = { dark: '#090c18', light: '#f3f0e8' }

export default function Home() {
  const [darkMode, setDarkMode] = useState(
    () => window.localStorage.getItem('skygraph-theme') !== 'light',
  )
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [airports, setAirports] = useState<Airport[]>([])
  // True until the airport list arrives (from the API or the sample data) or
  // fails; the suggestion dropdown shows a loading state meanwhile.
  const [airportsLoading, setAirportsLoading] = useState(true)
  const [results, setResults] = useState<RouteSearchResponse | null>(null)
  // The search that produced `results`. The heading and the graph explorer
  // read it, not the fields, which may have been edited or swapped since.
  const [searched, setSearched] = useState<RouteSearchRequest | null>(null)
  const [exploring, setExploring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const resultsRef = useRef<HTMLElement>(null)
  const sampleData = useSyncExternalStore(
    subscribeToSampleData,
    isUsingSampleData,
  )

  // Airport suggestions are a convenience: if they fail to load, codes can
  // still be typed, so the error is not shown.
  useEffect(() => {
    let active = true
    fetchAirports()
      .then((list) => {
        if (active) setAirports(list)
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setAirportsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // The page background past the app (overscroll, the browser's chrome)
  // follows the theme too.
  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', themeColours[theme])
  }, [darkMode])

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

  function swapAirports() {
    setOrigin(destination)
    setDestination(origin)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const from = origin.trim().toUpperCase()
    const to = destination.trim().toUpperCase()

    if (from === to) {
      setError('Origem e destino devem ser aeroportos diferentes.')
      setLoading(false)
      return
    }

    if (departureDate && returnDate && returnDate < departureDate) {
      setError('A data de volta deve ser igual ou posterior à data de ida.')
      setLoading(false)
      return
    }

    try {
      // An empty date is left out, keeping that end of the period open.
      const search = {
        origin: from,
        destination: to,
        ...(departureDate && { departureDate }),
        ...(returnDate && { returnDate }),
      }
      const response = await searchRoutes(search)
      setResults(response)
      setSearched(search)
    } catch (requestError) {
      setResults(null)
      setSearched(null)
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
    <div className={`page-shell ${darkMode ? 'theme-dark' : 'theme-light'}`}>
      <div className="page-backdrop" aria-hidden="true" />

      <header className="topbar">
        <Logo />
        <button
          className="theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo noturno'}
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
          <span className="theme-toggle__text">
            {darkMode ? 'Modo claro' : 'Modo noturno'}
          </span>
        </button>
      </header>

      {sampleData && (
        <p className="sample-notice" aria-live="polite">
          <span className="sample-notice__badge">Demonstração</span>
          Servidor indisponível: mostrando os dados de exemplo do SkyGraph (40
          aeroportos, 400 voos entre nov/2026 e mai/2027).
        </p>
      )}

      <main>
        <section className="hero" aria-labelledby="page-title">
          <div className="hero__copy">
            <p className="eyebrow">Planeje com inteligência</p>
            <h1 id="page-title">
              Encontre a <span className="hero__highlight">melhor rota</span>{' '}
              para sua viagem
            </h1>
            <p className="hero__description">
              Conecte aeroportos e descubra a rota mais barata para o seu
              próximo destino — mesmo que ela passe por uma conexão que você nem
              imaginava.
            </p>
            <ul className="hero__facts">
              <li>Menor preço total</li>
              <li>Algoritmo de Dijkstra</li>
              <li>
                {airports.length > 0
                  ? `${airports.length} aeroportos no grafo`
                  : 'Datas flexíveis'}
              </li>
            </ul>
          </div>
          <NetworkArt className="hero__art" />
        </section>

        <section className="search-panel" aria-label="Buscar rota">
          <RouteSearchForm
            airports={airports}
            airportsLoading={airportsLoading}
            origin={origin}
            destination={destination}
            departureDate={departureDate}
            returnDate={returnDate}
            loading={loading}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onSwap={swapAirports}
            onDepartureDateChange={setDepartureDate}
            onReturnDateChange={setReturnDate}
            onSubmit={handleSubmit}
          />

          {error && (
            <p className="feedback feedback--error" role="alert">
              <AlertIcon className="feedback__icon" />
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
              <div>
                <p className="eyebrow">Resultado</p>
                <h2 id="results-title">
                  Rota de {searched?.origin} para {searched?.destination}
                </h2>
              </div>
              <button
                className="graph-button"
                type="button"
                onClick={() => setExploring(true)}
              >
                <GraphIcon className="graph-button__icon" />
                <span>
                  <strong>Ver o grafo da busca</strong>
                  <small>Dijkstra passo a passo</small>
                </span>
              </button>
            </div>

            <div
              className={`results__grid ${results.route ? '' : 'results__grid--single'}`}
            >
              <RouteCard route={results.route} airports={airports} />

              {results.route && (
                <GlobeBoundary>
                  <Suspense
                    fallback={
                      <p className="route-globe__loading">
                        Carregando mapa 3D…
                      </p>
                    }
                  >
                    <RouteGlobe route={results.route} airports={airports} />
                  </Suspense>
                </GlobeBoundary>
              )}
            </div>
          </section>
        )}
      </main>

      {exploring && searched && results && (
        <Suspense
          fallback={
            <div className="graph-explorer graph-explorer--loading">
              <p className="graph-explorer__status">Montando o grafo…</p>
            </div>
          }
        >
          <GraphExplorer
            search={searched}
            airports={airports}
            apiRoute={results.route}
            onClose={() => setExploring(false)}
          />
        </Suspense>
      )}

      <footer className="footer">
        <span>
          SkyGraph · Projeto Integrador 3b — rotas calculadas sobre um grafo de
          voos.
        </span>
      </footer>
    </div>
  )
}
