import { Link } from 'react-router-dom'
import { Compass, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDocumentMeta } from '@/hooks/use-utils'

export function NotFoundPage({
  title = 'Página não encontrada',
  description = 'O endereço acessado não existe, mudou de lugar ou o conteúdo saiu do ar.',
}) {
  useDocumentMeta({ title })

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-muted-foreground/40 text-7xl">404</p>
      <h1 className="font-display mt-4 text-3xl">{title}</h1>
      <p className="text-muted-foreground mt-3 max-w-md text-pretty">{description}</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link to="/">
            <Home aria-hidden="true" />
            Voltar ao início
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/buscar">
            <Compass aria-hidden="true" />
            Explorar iniciativas
          </Link>
        </Button>
      </div>
    </div>
  )
}
