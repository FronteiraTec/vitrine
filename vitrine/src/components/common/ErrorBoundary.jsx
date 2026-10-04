import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translateNow } from '@/i18n/store'

/**
 * Última linha de defesa: evita a tela branca quando um componente quebra.
 * Erros de dados são tratados nas próprias telas (ErrorState).
 *
 * O texto vem de `translateNow`, e não do contexto de idioma: esta tela
 * aparece justamente quando a árvore do React — inclusive o provider —
 * quebrou. O store guarda o idioma em que a página estava pintada.
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
      <div className="d-flex min-vh-100 align-items-center justify-content-center p-4">
        <div className="card mw-md space-y-3 p-5 text-center">
          <div className="bg-danger-subtle text-danger mx-auto d-flex h-fx-12 w-fx-12 align-items-center justify-content-center rounded-pill">
            <AlertTriangle className="icon-xl" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="fs-5 fw-semibold">{translateNow('errorBoundary.title')}</h1>
            <p className="text-body-secondary fs-7 text-pretty">
              {translateNow('errorBoundary.description')}
            </p>
          </div>
          <details className="text-body-secondary text-start fs-8">
            <summary className="py-1">{translateNow('errorBoundary.details')}</summary>
            <pre className="bg-body-secondary mt-2 max-h-fx-40 overflow-auto rounded-2 p-2 text-prewrap">
              {String(this.state.error?.message ?? this.state.error)}
            </pre>
          </details>
          <Button onClick={() => window.location.reload()}>
            {translateNow('errorBoundary.reload')}
          </Button>
        </div>
      </div>
    )
  }
}
