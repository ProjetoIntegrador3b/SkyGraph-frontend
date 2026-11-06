import { render, screen } from '@testing-library/react'
import { airports, routeResponse } from '../test/api'
import RouteCard from './RouteCard'

describe('RouteCard', () => {
  it('shows the totals and every leg', () => {
    render(<RouteCard route={routeResponse.route} airports={airports} />)

    expect(screen.getByText(/984,95/)).toBeInTheDocument()
    expect(screen.getByText('1 conexão')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    // A leg that lands on a later day shows both days.
    expect(
      screen.getByText(/12 de jan\.? de 2027 → 13 de jan\.? de 2027/),
    ).toBeInTheDocument()
  })

  it('falls back to the code for an airport it does not know', () => {
    render(<RouteCard route={routeResponse.route} airports={airports} />)

    expect(screen.getByText('FOR · Fortaleza → JFK')).toBeInTheDocument()
  })

  it('lists every stop of a long route, in order', () => {
    const codes = [
      'MAO',
      'DXB',
      'SSA',
      'FOR',
      'FLN',
      'LHR',
      'MEX',
      'BSB',
      'SCL',
      'MAD',
    ]
    const legs = codes.slice(1).map((code, index) => ({
      uuid: `leg-${index}`,
      price: 100,
      origin: codes[index],
      destination: code,
      departureDate: '2027-01-01',
      arrivalDate: '2027-01-01',
    }))
    const route = {
      price: 900,
      connections: legs.length - 1,
      departureDate: '2027-01-01',
      arrivalDate: '2027-01-01',
      legs,
    }

    const { container } = render(<RouteCard route={route} airports={[]} />)

    const stops = [...container.querySelectorAll('.journey__stop')].map(
      (stop) => stop.textContent,
    )
    expect(stops).toEqual(codes.slice(1, -1))
    expect(screen.getAllByRole('listitem')).toHaveLength(9)
  })

  it('shows no stops row for a direct flight', () => {
    const direct = {
      ...routeResponse.route!,
      connections: 0,
      legs: [{ ...routeResponse.route!.legs[0], destination: 'JFK' }],
    }

    const { container } = render(<RouteCard route={direct} airports={[]} />)

    expect(container.querySelector('.journey__stops')).toBeNull()
  })

  it('labels a direct flight', () => {
    const direct = { ...routeResponse.route!, connections: 0 }

    render(<RouteCard route={direct} airports={[]} />)

    expect(screen.getByText('Voo direto')).toBeInTheDocument()
  })

  it('suggests widening the dates when there is no route', () => {
    render(<RouteCard route={null} airports={airports} />)

    expect(screen.getByText(/Tente ampliar as datas/)).toBeInTheDocument()
  })
})
