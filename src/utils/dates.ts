// Dates travel as ISO calendar days (YYYY-MM-DD), the format the API uses.

const dayFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

// Parse as a local day, so the time zone never shifts it.
export function keyToDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDay(value: string) {
  return dayFormatter.format(keyToDate(value))
}
