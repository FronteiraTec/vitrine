import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Image } from '@/components/ui/image'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { cn, truncate } from '@/lib/utils'

/**
 * Cartão de categoria com imagem de capa, configurada em /admin/categorias.
 *
 * A faixa é sempre renderizada, mesmo sem imagem: categorias com e sem capa
 * aparecem lado a lado no mesmo trilho, e cartões de formatos diferentes
 * deixariam a fileira desalinhada. Sem imagem, a faixa exibe o ícone da
 * categoria sobre o tom de acento — o mesmo ícone que o cartão mostrava antes,
 * agora no papel de reserva.
 */
export function CategoryCard({ category, className }) {
  const count = category.published_count

  return (
    <Link
      to={`/categoria/${category.slug}`}
      className={cn(
        'group border-border bg-card hover:border-brand/35 hover:shadow-raised flex flex-col overflow-hidden rounded-lg border transition-all duration-200',
        className,
      )}
    >
      <div className="relative">
        {category.image_url ? (
          <Image
            src={category.image_url}
            alt=""
            ratio="aspect-[16/9]"
            className="transition-transform duration-300 group-hover:scale-[1.03]"
            fallbackIcon={(props) => <CategoryIcon name={category.icon} {...props} />}
          />
        ) : (
          <div className="bg-accent text-accent-foreground/70 flex aspect-[16/9] items-center justify-center">
            <CategoryIcon name={category.icon} className="size-10" />
          </div>
        )}

        {/* A seta ganha superfície própria porque flutua sobre a imagem, onde
            não há contraste garantido com o que estiver atrás. */}
        <span className="bg-card/90 text-muted-foreground group-hover:bg-brand group-hover:text-primary-foreground absolute top-3 right-3 flex size-8 items-center justify-center rounded-md shadow-subtle backdrop-blur-sm transition-all duration-200">
          <ArrowUpRight
            className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="space-y-1.5">
          <h3 className="leading-snug font-semibold">{category.name}</h3>
          {category.description ? (
            <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
              {truncate(category.description, 110)}
            </p>
          ) : null}
        </div>

        {typeof count === 'number' ? (
          <p className="text-muted-foreground mt-auto pt-1 text-xs tabular-nums">
            {count === 0
              ? 'Nenhuma iniciativa publicada'
              : `${count} ${count === 1 ? 'iniciativa' : 'iniciativas'}`}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
