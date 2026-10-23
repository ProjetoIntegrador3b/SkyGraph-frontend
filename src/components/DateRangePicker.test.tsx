import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    await userEvent.click(screen.getByText('Escolha o período'))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
