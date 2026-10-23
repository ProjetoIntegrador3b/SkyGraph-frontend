import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import DateRangePicker from './DateRangePicker'

function renderPicker() {
  return render(
    <DateRangePicker
      departureDate=""
      returnDate=""
      onDepartureDateChange={() => {}}
      onReturnDateChange={() => {}}
    />,
  )
}

// Holds both dates like RouteSearchForm does, and exposes them for assertions.
function Harness() {
  const [departure, setDeparture] = useState('')
  const [ret, setRet] = useState('')
  return (
    <>
      <DateRangePicker
        departureDate={departure}
        returnDate={ret}
        onDepartureDateChange={setDeparture}
        onReturnDateChange={setRet}
      />
      <output data-testid="dates">{`${departure}|${ret}`}</output>
    </>
  )
}

// Days of the month after the current one are always in the future.
async function pickNextMonthDay(trigger: 'Ida' | 'Volta', day: number) {
  await userEvent.click(screen.getByLabelText(trigger))
  await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }))
  await userEvent.click(
    screen.getAllByRole('button', { name: new RegExp(`\\b${day} de`) })[0],
  )
}

describe('DateRangePicker', () => {
  it('closes the calendar when clicking outside of it', async () => {
    renderPicker()

    await userEvent.click(screen.getByLabelText('Ida'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const backdrop = document.querySelector('.calendar-backdrop')
    expect(backdrop).not.toBeNull()
    await userEvent.click(backdrop as Element)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the calendar open when clicking inside it', async () => {
    renderPicker()

    await userEvent.click(screen.getByLabelText('Ida'))
    await userEvent.click(screen.getByText('Escolha a data de ida'))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes after picking the departure date', async () => {
    render(<Harness />)

    await pickNextMonthDay('Ida', 15)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('dates').textContent).toMatch(
      /^\d{4}-\d{2}-15\|$/,
    )
  })

  it('closes after picking the return date', async () => {
    render(<Harness />)
    await pickNextMonthDay('Ida', 15)

    await userEvent.click(screen.getByLabelText('Volta'))
    expect(screen.getByText('Escolha a data de volta')).toBeInTheDocument()
    // The calendar reopens on the month it was left at.
    await userEvent.click(screen.getAllByRole('button', { name: /\b20 de/ })[0])

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('dates').textContent).toMatch(
      /^\d{4}-\d{2}-15\|\d{4}-\d{2}-20$/,
    )
  })

  it('changes only the departure when Ida is used again', async () => {
    render(<Harness />)
    await pickNextMonthDay('Ida', 10)
    await userEvent.click(screen.getByLabelText('Volta'))
    await userEvent.click(screen.getAllByRole('button', { name: /\b20 de/ })[0])

    await userEvent.click(screen.getByLabelText('Ida'))
    await userEvent.click(screen.getAllByRole('button', { name: /\b12 de/ })[0])

    expect(screen.getByTestId('dates').textContent).toMatch(
      /^\d{4}-\d{2}-12\|\d{4}-\d{2}-20$/,
    )
  })

  it('disables return days before the departure', async () => {
    render(<Harness />)
    await pickNextMonthDay('Ida', 15)

    await userEvent.click(screen.getByLabelText('Volta'))

    expect(screen.getAllByRole('button', { name: /\b14 de/ })[0]).toBeDisabled()
    expect(screen.getAllByRole('button', { name: /\b15 de/ })[0]).toBeEnabled()
  })

  it('disables departure days after the return', async () => {
    render(<Harness />)
    await pickNextMonthDay('Ida', 10)
    await userEvent.click(screen.getByLabelText('Volta'))
    await userEvent.click(screen.getAllByRole('button', { name: /\b20 de/ })[0])

    await userEvent.click(screen.getByLabelText('Ida'))

    expect(screen.getAllByRole('button', { name: /\b20 de/ })[0]).toBeEnabled()
    expect(screen.getAllByRole('button', { name: /\b21 de/ })[0]).toBeDisabled()
  })

  it('blocks nothing beyond past days while the other date is empty', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByLabelText('Volta'))
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }))

    for (const day of [1, 15, 28]) {
      expect(
        screen.getAllByRole('button', { name: new RegExp(`\\b${day} de`) })[0],
      ).toBeEnabled()
    }
  })

  it('shows a single month', async () => {
    renderPicker()

    await userEvent.click(screen.getByLabelText('Ida'))

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
  })

  it('opens on the month of the date already chosen', async () => {
    render(<Harness />)
    await pickNextMonthDay('Ida', 15)
    await userEvent.click(screen.getByLabelText('Ida'))
    const departureMonth = screen.getByRole('heading', { level: 3 }).textContent

    // Browse two months ahead, then close without picking.
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }))
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }))
    await userEvent.click(document.querySelector('.calendar-backdrop')!)

    await userEvent.click(screen.getByLabelText('Volta'))

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      departureMonth!,
    )
  })

  it('shows "Qualquer data" for an empty date', () => {
    renderPicker()

    expect(screen.getByLabelText('Ida')).toHaveTextContent('Qualquer data')
    expect(screen.getByLabelText('Volta')).toHaveTextContent('Qualquer data')
  })

  it('clears only the date being chosen and closes', async () => {
    render(<Harness />)
    await pickNextMonthDay('Ida', 10)
    await userEvent.click(screen.getByLabelText('Volta'))
    await userEvent.click(screen.getAllByRole('button', { name: /\b20 de/ })[0])

    await userEvent.click(screen.getByLabelText('Volta'))
    await userEvent.click(screen.getByRole('button', { name: 'Limpar data' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('dates').textContent).toMatch(
      /^\d{4}-\d{2}-10\|$/,
    )
  })

  it('disables "Limpar data" when the date is already empty', async () => {
    renderPicker()

    await userEvent.click(screen.getByLabelText('Ida'))

    expect(screen.getByRole('button', { name: 'Limpar data' })).toBeDisabled()
  })

  it('shows an × only on dates that are set', async () => {
    render(<Harness />)
    expect(screen.queryByRole('button', { name: /Limpar data de/ })).toBeNull()

    await pickNextMonthDay('Ida', 10)

    expect(
      screen.getByRole('button', { name: 'Limpar data de ida' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Limpar data de volta' }),
    ).toBeNull()
  })

  it('clears a date with its × without opening the calendar', async () => {
    render(<Harness />)
    await pickNextMonthDay('Ida', 10)
    await userEvent.click(screen.getByLabelText('Volta'))
    await userEvent.click(screen.getAllByRole('button', { name: /\b20 de/ })[0])

    await userEvent.click(
      screen.getByRole('button', { name: 'Limpar data de ida' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('dates').textContent).toMatch(
      /^\|\d{4}-\d{2}-20$/,
    )
    expect(screen.getByLabelText('Ida')).toHaveTextContent('Qualquer data')

    await userEvent.click(
      screen.getByRole('button', { name: 'Limpar data de volta' }),
    )

    expect(screen.getByTestId('dates')).toHaveTextContent('|')
    expect(screen.queryByRole('button', { name: /Limpar data de/ })).toBeNull()
  })
})
