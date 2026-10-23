import { Component, type ReactNode } from 'react'

interface GlobeBoundaryProps {
  children: ReactNode
}

// The globe needs WebGL. Where it is missing or fails, show a short note
// instead of breaking the results above it.
export default class GlobeBoundary extends Component<
  GlobeBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="route-globe__loading">
          Não foi possível exibir o mapa 3D neste navegador.
        </p>
      )
    }
    return this.props.children
  }
}
