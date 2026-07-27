import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

interface RouteErrorBoundaryProps {
  children: ReactNode
}

interface RouteErrorBoundaryState {
  error: Error | null
}

function isChunkLoadError(error: Error): boolean {
  const message = error.message.toLowerCase()
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  )
}

export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Route render error', error, info.componentStack)
  }

  private handleRetry = (): void => {
    this.setState({ error: null })
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    const chunkError = isChunkLoadError(error)

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-light text-danger">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">
            {chunkError ? 'No se pudo cargar la página' : 'Algo salió mal'}
          </h2>
          <p className="text-sm text-text-secondary">
            {chunkError
              ? 'La vista no terminó de cargar. Podés reintentar o recargar la aplicación.'
              : 'Ocurrió un error al mostrar esta pantalla.'}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {!chunkError ? (
            <Button variant="outline" onClick={this.handleRetry}>
              Reintentar
            </Button>
          ) : null}
          <Button onClick={this.handleReload}>
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>
        </div>
      </div>
    )
  }
}
