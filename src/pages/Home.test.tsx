import { render, screen } from '@testing-library/react'
import Home from './Home'

describe('Home', () => {
  it('renders the greeting', () => {
    render(<Home />)

    expect(
      screen.getByRole('heading', { name: 'Hello SkyGraphers' }),
    ).toBeInTheDocument()
  })
})
