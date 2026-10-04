import { Link } from 'react-router-dom'
import { Compass, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDocumentMeta } from '@/hooks/use-seo'
import { useLocale } from '@/contexts/LocaleContext'
import { PRIVATE_ROBOTS } from '@/lib/seo'

export function NotFoundPage({ title: customTitle, description: customDescription }) {
  const { t } = useLocale()
  const title = customTitle ?? t('notFound.title')
  const description = customDescription ?? t('notFound.description')

  useDocumentMeta({ title, robots: PRIVATE_ROBOTS })

  return (
    <div className="container d-flex flex-column align-items-center justify-content-center py-5 text-center">
      <p className="fw-bold text-body-secondary opacity-50 fs-1">404</p>
      <h1 className="fw-bold mt-3 fs-3">{title}</h1>
      <p className="text-body-secondary mt-2 mw-md text-pretty">{description}</p>

      <div className="mt-5 d-flex flex-column gap-2 flex-sm-row">
        <Button asChild>
          <Link to="/">
            <Home aria-hidden="true" />
            {t('notFound.home')}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/buscar">
            <Compass aria-hidden="true" />
            {t('notFound.explore')}
          </Link>
        </Button>
      </div>
    </div>
  )
}
