import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { Airport } from '../types/airport'
import AirportSelect from './AirportSelect'

const airport = (code: string, name: string, city: string, country: string) =>
  ({ code, name, city, country, latitude: 0, longitude: 0 }) satisfies Airport

const airports = [
  airport(
    'JFK',
    'John F. Kennedy International Airport',
    'Nova York',
    'Estados Unidos',
  ),
  airport('GRU', 'Aeroporto Internacional de Guarulhos', 'São Paulo', 'Brasil'),
  airport('CGH', 'Aeroporto de Congonhas', 'São Paulo', 'Brasil'),
  airport(
    'GIG',
    'Aeroporto Internacional do Galeão',
    'Rio de Janeiro',
    'Brasil',
  ),
]

// Holds the value like RouteSearchForm does, and exposes it for assertions.
function Harness() {
  const [value, setValue] = useState('')
  return (
    <>
      <AirportSelect
        id="origin"
        label="Origem"
        placeholder=""
        value={value}
        airports={airports}
        onChange={setValue}
      />
      <output data-testid="value">{value}</output>
    </>
  )
}

const optionNames = () =>
  screen.getAllByRole('option').map((option) => option.textContent)

describe('AirportSelect', () => {
  it('lists every airport as country - code - name, by country then code', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Origem' }))

    expect(optionNames()).toEqual([
      'Brasil - CGH - Aeroporto de Congonhas',
      'Brasil - GIG - Aeroporto Internacional do Galeão',
      'Brasil - GRU - Aeroporto Internacional de Guarulhos',
      'Estados Unidos - JFK - John F. Kennedy International Airport',
    ])
  })

  it('filters by city, ignoring case and accents', async () => {
    render(<Harness />)

    await userEvent.type(screen.getByRole('combobox'), 'sao paulo')

    expect(optionNames()).toEqual([
      'Brasil - CGH - Aeroporto de Congonhas',
      'Brasil - GRU - Aeroporto Internacional de Guarulhos',
    ])
  })

  it('filters by country and by airport name', async () => {
    render(<Harness />)
    const input = screen.getByRole('combobox')

    await userEvent.type(input, 'estados')
    expect(optionNames()).toEqual([
      'Estados Unidos - JFK - John F. Kennedy International Airport',
    ])

    await userEvent.clear(input)
    await userEvent.type(input, 'galeão')
    expect(optionNames()).toEqual([
      'Brasil - GIG - Aeroporto Internacional do Galeão',
    ])
  })

  it('puts codes that start with the text first', async () => {
    render(<Harness />)

    // "g" is in every Brazilian name; GIG and GRU start with it.
    await userEvent.type(screen.getByRole('combobox'), 'g')

    expect(optionNames().slice(0, 2)).toEqual([
      'Brasil - GIG - Aeroporto Internacional do Galeão',
      'Brasil - GRU - Aeroporto Internacional de Guarulhos',
    ])
  })

  it('fills in the code when a suggestion is clicked', async () => {
    render(<Harness />)

    await userEvent.type(screen.getByRole('combobox'), 'guarulhos')
    await userEvent.click(
      screen.getByRole('option', { name: /GRU - Aeroporto Internacional/ }),
    )

    expect(screen.getByTestId('value')).toHaveTextContent('GRU')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('can be used with the keyboard', async () => {
    render(<Harness />)
    const input = screen.getByRole('combobox')

    await userEvent.type(input, 'sao')
    await userEvent.keyboard('{ArrowDown}{Enter}')

    // The second suggestion, GRU, after CGH.
    expect(screen.getByTestId('value')).toHaveTextContent('GRU')

    await userEvent.type(input, '{ArrowDown}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('accepts a typed code and hides the list when nothing matches', async () => {
    render(<Harness />)

    await userEvent.type(screen.getByRole('combobox'), 'XYZ')

    expect(screen.getByTestId('value')).toHaveTextContent('XYZ')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes the list when the field loses focus', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await userEvent.tab()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  describe('while the airport list is loading', () => {
    // The page passes airports and loading; rerender stands in for the list
    // arriving.
    function LoadingHarness({
      list,
      loading,
    }: {
      list: Airport[]
      loading: boolean
    }) {
      const [value, setValue] = useState('')
      return (
        <AirportSelect
          id="origin"
          label="Origem"
          placeholder=""
          value={value}
          airports={list}
          loading={loading}
          onChange={setValue}
        />
      )
    }

    it('says the airports are loading instead of showing nothing', async () => {
      render(<LoadingHarness list={[]} loading />)

      await userEvent.type(screen.getByRole('combobox'), 'Bel')

      expect(screen.getByRole('status')).toHaveTextContent(
        'Carregando aeroportos…',
      )
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('shows the matches for what was typed once they arrive', async () => {
      const { rerender } = render(<LoadingHarness list={[]} loading />)
      await userEvent.type(screen.getByRole('combobox'), 'sao')

      rerender(<LoadingHarness list={airports} loading={false} />)

      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(optionNames()).toEqual([
        'Brasil - CGH - Aeroporto de Congonhas',
        'Brasil - GRU - Aeroporto Internacional de Guarulhos',
      ])
    })

    it('shows nothing once loading is over without airports', async () => {
      render(<LoadingHarness list={[]} loading={false} />)

      await userEvent.type(screen.getByRole('combobox'), 'Bel')

      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('hides the loading message when the field loses focus', async () => {
      render(<LoadingHarness list={[]} loading />)

      await userEvent.click(screen.getByRole('combobox'))
      expect(screen.getByRole('status')).toBeInTheDocument()

      await userEvent.tab()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })
})
