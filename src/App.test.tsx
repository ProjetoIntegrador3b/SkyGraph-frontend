import { render, screen } from '@testing-library/react'
import App from './App'

describe('App routing', () => {
  it('shows the greeting at /home', () => {
    window.history.pushState({}, '', '/home')
    render(<App />)

    expect(screen.getByText('Hello SkyGraphers')).toBeInTheDocument()
  })

  it('redirects / to /home', () => {
    window.history.pushState({}, '', '/')
    render(<App />)

    expect(window.location.pathname).toBe('/home')
    expect(screen.getByText('Hello SkyGraphers')).toBeInTheDocument()
  })
})
