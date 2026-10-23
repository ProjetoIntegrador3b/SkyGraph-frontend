import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import GlobeBoundary from './GlobeBoundary'

function Broken(): never {
  throw new Error('WebGL not supported')
}

describe('GlobeBoundary', () => {
  it('shows a note instead of a globe that fails', () => {
    // React logs the caught error; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <GlobeBoundary>
        <Broken />
      </GlobeBoundary>,
    )

    expect(
      screen.getByText('Não foi possível exibir o mapa 3D neste navegador.'),
    ).toBeInTheDocument()
  })
})
