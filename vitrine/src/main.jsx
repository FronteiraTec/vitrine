import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { preloadLocale } from '@/i18n/store'
import { App } from './App'
import './styles/main.scss'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Erro de permissão não melhora com nova tentativa.
        if (/permissão|permission|row-level/i.test(error?.message ?? '')) return false
        return failureCount < 2
      },
    },
  },
})

/*
 * O dicionário do idioma da primeira tela chega ANTES da primeira pintura.
 * Para quem não escolheu idioma nenhum (e para o rastreador, fora das URLs em
 * inglês e espanhol) não há o que esperar: o português já está no bundle.
 */
preloadLocale(window.location.pathname).finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        {/*
          AuthProvider fica FORA do RouterProvider: ele não usa hooks de rota, e
          assim o contexto continua disponível para todas as rotas.
        */}
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider delayDuration={300}>
              <App />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
})
