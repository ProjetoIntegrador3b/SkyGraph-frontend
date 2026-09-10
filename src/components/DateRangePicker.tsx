import { useEffect, useMemo, useRef, useState } from 'react'

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
  const [selectingReturn, setSelectingReturn] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const today = getToday()
  const months = useMemo(
    () => [visibleMonth, addMonths(visibleMonth, 1)],
    [visibleMonth],
  )

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  function chooseDate(date: Date) {
    const value = dateToKey(date)

    if (!selectingReturn || !departureDate || value < departureDate) {
      onDepartureDateChange(value)
      onReturnDateChange('')
      setSelectingReturn(true)
      return
    }

    onReturnDateChange(value)
    setSelectingReturn(false)
    setOpen(false)
  }

  function openPicker(mode: 'departure' | 'return') {
    setSelectingReturn(mode === 'return' || Boolean(departureDate))
    setOpen(true)
  }

  return (
    <div className="date-picker" ref={pickerRef}>
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
        <div className="calendar-backdrop">
          <div
            className="calendar-popover"
            role="dialog"
            aria-label="Selecionar período"
            aria-modal="true"
          >
            <div className="calendar-header">
              <div>
                <strong>Escolha o período</strong>
                <span>
                  {selectingReturn
                    ? 'Agora selecione a volta'
                    : 'Agora selecione a ida'}
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

            <div className="calendar-months">
              {months.map((month) => (
                <div className="calendar-month" key={month.toISOString()}>
                  <h3>{monthFormatter.format(month)}</h3>
                  <div className="calendar-weekdays" aria-hidden="true">
                    {weekdays.map((day, index) => (
                      <span key={`${day}-${index}`}>{day}</span>
                    ))}
                  </div>
                  <div className="calendar-days">
                    {getMonthDays(month).map((date, index) => {
                      if (!date) {
                        return (
                          <span
                            className="calendar-day--empty"
                            key={`empty-${index}`}
                          />
                        )
                      }

                      const value = dateToKey(date)
                      const disabled = value < today
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
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
