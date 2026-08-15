import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Imagem com lazy loading, transição de entrada e fallback visual.
 * Evita "flash" de área vazia e trata URLs quebradas do Storage sem
 * mostrar o ícone padrão de imagem quebrada do navegador.
 */
export function Image({
  src,
  alt = '',
  className,
  wrapperClassName,
  ratio = 'aspect-[16/10]',
  eager = false,
  fallbackIcon: FallbackIcon = ImageOff,
  ...props
}) {
  const [state, setState] = useState(src ? 'loading' : 'error')

  return (
    <div className={cn('bg-muted relative overflow-hidden', ratio, wrapperClassName)}>
      {src && state !== 'error' ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
          className={cn(
            'size-full object-cover transition-opacity duration-500',
            state === 'loaded' ? 'opacity-100' : 'opacity-0',
            className,
          )}
          {...props}
        />
      ) : null}

      {state === 'error' ? (
        <div className="text-muted-foreground/40 absolute inset-0 flex items-center justify-center">
          <FallbackIcon className="size-7" aria-hidden="true" />
        </div>
      ) : null}
    </div>
  )
}
