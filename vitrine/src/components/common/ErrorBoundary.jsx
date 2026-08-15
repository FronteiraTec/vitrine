import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Última linha de defesa: evita a tela branca quando um componente quebra.
 * Erros de dados são tratados nas próprias telas (ErrorState).
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Erro não tratado na interface:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="surface max-w-md space-y-4 p-8 text-center">
          <div className="bg-destructive/10 text-destructive mx-auto flex size-12 items-center justify-center rounded-full">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold">Algo deu errado</h1>
            <p className="text-muted-foreground text-sm text-pretty">
              A página encontrou um erro inesperado. Recarregar costuma resolver.
            </p>
          </div>
          <details className="text-muted-foreground text-left text-xs">
            <summary className="cursor-pointer py-1">Detalhes técnicos</summary>
            <pre className="bg-muted mt-2 max-h-40 overflow-auto rounded-md p-3 whitespace-pre-wrap">
              {String(this.state.error?.message ?? this.state.error)}
            </pre>
          </details>
          <Button onClick={() => window.location.reload()}>Recarregar página</Button>
        </div>
      </div>
    )
  }
}
