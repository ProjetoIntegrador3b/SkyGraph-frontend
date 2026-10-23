import { useState } from 'react'

interface DateRangePickerProps {
  departureDate: string
  returnDate: string
  onDepartureDateChange: (value: string) => void
  onReturnDateChange: (value: string) => void
}

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
})
const displayFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function dateToKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function keyToDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function getToday() {
  return dateToKey(new Date())
}

function getMonthDays(month: Date) {
  const firstDay = startOfMonth(month)
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate()
  const leadingDays = firstDay.getDay()
  const days: (Date | null)[] = Array.from({ length: leadingDays }, () => null)

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day))
  }

  return days
}

function formatDate(value: string) {
  return value ? displayFormatter.format(keyToDate(value)) : 'Selecionar data'
}

export default function DateRangePicker({
  departureDate,
  returnDate,
  onDepartureDateChange,
  onReturnDateChange,
}: DateRangePickerProps) {
  const initialMonth = departureDate ? keyToDate(departureDate) : new Date()
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(initialMonth))
  const [open, setOpen] = useState(false)
  // Which date the open calendar sets: each button picks its own date.
  const [selectingReturn, setSelectingReturn] = useState(false)
  const today = getToday()

  // Picking a day sets the date being chosen and closes the calendar. Days
  // that would make an invalid period are disabled, so no check is needed.
  function chooseDate(date: Date) {
    const value = dateToKey(date)

    if (selectingReturn) {
      onReturnDateChange(value)
    } else {
      onDepartureDateChange(value)
    }
    setOpen(false)
  }

  // Past days are never available; the return cannot come before the
  // departure, and the departure cannot come after the return.
  function isDisabled(value: string) {
    if (value < today) return true
    if (selectingReturn) return Boolean(departureDate) && value < departureDate
    return Boolean(returnDate) && value > returnDate
  }

  // Open on the month of the date being changed, or of the other date.
  function openPicker(mode: 'departure' | 'return') {
    const anchor =
      mode === 'return'
        ? returnDate || departureDate
        : departureDate || returnDate
    if (anchor) {
      setVisibleMonth(startOfMonth(keyToDate(anchor)))
    }
    setSelectingReturn(mode === 'return')
    setOpen(true)
  }

  return (
    <div className="date-picker">
      <div className="date-picker__fields">
        <div className="field">
          <label htmlFor="departure-date-trigger">Ida</label>
          <button
            id="departure-date-trigger"
            className="date-trigger"
            type="button"
            onClick={() => openPicker('departure')}
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <span aria-hidden="true">✈</span>
            {formatDate(departureDate)}
          </button>
        </div>
        <div className="field">
          <label htmlFor="return-date-trigger">Volta</label>
          <button
            id="return-date-trigger"
            className="date-trigger"
            type="button"
            onClick={() => openPicker('return')}
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <span aria-hidden="true">↩</span>
            {formatDate(returnDate)}
          </button>
        </div>
      </div>

      {open && (
        <div
          className="calendar-backdrop"
          onMouseDown={(event) => {
            // The backdrop covers the viewport, so a press that lands on it
            // rather than bubbling up from the popover is a click outside.
            if (event.target === event.currentTarget) {
              setOpen(false)
            }
          }}
        >
          <div
            className="calendar-popover"
            role="dialog"
            aria-label="Selecionar período"
            aria-modal="true"
          >
            <div className="calendar-header">
              <div>
                <strong>
                  {selectingReturn
                    ? 'Escolha a data de volta'
                    : 'Escolha a data de ida'}
                </strong>
                <span>
                  {selectingReturn
                    ? 'Dias antes da ida não podem ser escolhidos'
                    : 'Dias passados ou depois da volta não podem ser escolhidos'}
                </span>
              </div>
              <div className="calendar-navigation">
                <button
                  type="button"
                  className="calendar-nav"
                  onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
                  disabled={visibleMonth <= startOfMonth(new Date())}
                  aria-label="Mês anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="calendar-nav"
                  onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
                  aria-label="Próximo mês"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="calendar-month">
              <h3>{monthFormatter.format(visibleMonth)}</h3>
              <div className="calendar-weekdays" aria-hidden="true">
                {weekdays.map((day, index) => (
                  <span key={`${day}-${index}`}>{day}</span>
                ))}
              </div>
              <div className="calendar-days">
                {getMonthDays(visibleMonth).map((date, index) => {
                  if (!date) {
                    return (
                      <span
                        className="calendar-day--empty"
                        key={`empty-${index}`}
                      />
                    )
                  }

                  const value = dateToKey(date)
                  const disabled = isDisabled(value)
                  const selected =
                    value === departureDate || value === returnDate
                  const inRange =
                    Boolean(departureDate && returnDate) &&
                    value > departureDate &&
                    value < returnDate

                  return (
                    <button
                      className={`calendar-day ${selected ? 'is-selected' : ''} ${inRange ? 'is-in-range' : ''}`}
                      type="button"
                      key={value}
                      disabled={disabled}
                      onClick={() => chooseDate(date)}
                      aria-label={date.toLocaleDateString('pt-BR', {
                        dateStyle: 'full',
                      })}
                      aria-pressed={selected}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
