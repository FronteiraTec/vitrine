import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Imagem com lazy loading, transição de entrada e reserva visual.
 *
 * A proporção vem das classes `.ratio` do Bootstrap (`ratio-16x9`, `ratio-1x1`)
 * e o recorte de `.media-frame`, no SCSS do projeto — o `.ratio` sozinho reserva
 * o espaço, mas não faz a foto preencher o quadro sem distorcer.
 *
 * `ratio={null}` desliga a reserva de espaço: é o caso em que o pai já tem
 * altura própria e a imagem deve preenchê-lo (a capa da página de iniciativa).
 * Com `.ratio` aplicado ali, o `::before` do Bootstrap imporia uma proporção
 * que briga com a altura do pai.
 */
export function Image({
  src,
  alt = '',
  className,
  wrapperClassName,
  ratio = 'ratio-16x9',
  eager = false,
  fallbackIcon: FallbackIcon = ImageOff,
  ...props
}) {
  const [state, setState] = useState(src ? 'loading' : 'error')

  return (
    <div className={cn(ratio && 'ratio', 'media-frame', ratio, wrapperClassName)}>
      {src && state !== 'error' ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
          className={cn(state === 'loaded' ? 'opacity-100' : 'opacity-0', className)}
          style={{ transition: 'opacity 0.4s ease' }}
          {...props}
        />
      ) : null}

      {state === 'error' ? (
        <div className="d-flex align-items-center justify-content-center text-body-secondary opacity-50">
          <FallbackIcon className="icon-xl" aria-hidden="true" />
        </div>
      ) : null}
    </div>
  )
}
