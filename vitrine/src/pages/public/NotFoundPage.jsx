import { Link } from 'react-router-dom'
import { Compass, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NaoEncontrado } from '@/components/common/NaoEncontrado'
import { useDocumentMeta } from '@/hooks/use-seo'
import { useLocale } from '@/contexts/LocaleContext'
import { PRIVATE_ROBOTS } from '@/lib/seo'

export function NotFoundPage({ title: customTitle, description: customDescription }) {
  const { t } = useLocale()
  const title = customTitle ?? t('notFound.title')
  const description = customDescription ?? t('notFound.description')

  useDocumentMeta({ title, robots: PRIVATE_ROBOTS })

  return (
    <NaoEncontrado title={title} description={description} mensagem={t('notFound.mascot')}>
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
    </NaoEncontrado>
  )
}
