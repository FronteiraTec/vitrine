import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * Preferência de movimento e visibilidade da aba são estado que mora fora do
 * React. `useSyncExternalStore` é o que assina esse tipo de fonte sem um efeito
 * que chama `setState` no próprio corpo — além de já receber o valor correto no
 * primeiro render, em vez de assumir um padrão e corrigir depois.
 */
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function subscribeVisibility(onChange) {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

/** Na renderização de servidor não há preferência a consultar: assume o padrão. */
const serverFalse = () => false

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    serverFalse,
  )
}

function useTabHidden() {
  return useSyncExternalStore(subscribeVisibility, () => document.hidden, serverFalse)
}

/**
 * Trilho horizontal com rolagem por encaixe (`scroll-snap`).
 *
 * A rolagem é nativa, não simulada com `transform`: o dedo arrasta, a roda do
 * mouse com shift funciona, o teclado alcança cada cartão pela ordem natural de
 * foco e o navegador traz para a área visível o item que recebeu foco. Um
 * carrossel que troca `translateX` precisaria reimplementar tudo isso — e
 * costuma esquecer o teclado.
 *
 * Os botões são um atalho para quem usa mouse, não o único caminho: por isso
 * somem quando todo o conteúdo já cabe na tela, em vez de ficarem inertes.
 *
 * Com `autoPlay`, o avanço automático segue a regra 2.2.2 do WCAG — movimento
 * que dura mais de cinco segundos precisa de um jeito de parar. Aqui são
 * quatro, e todos param de verdade, não apenas adiam o próximo passo:
 *
 *   - botão explícito de pausa, sempre visível enquanto roda;
 *   - ponteiro sobre o trilho ou foco de teclado dentro dele;
 *   - aba em segundo plano, que não deveria consumir nada;
 *   - `prefers-reduced-motion`, que desliga o automático por completo.
 */
export function Carousel({
  label,
  children,
  className,
  trackClassName,
  autoPlay = false,
  interval = 5000,
}) {
  const trackRef = useRef(null)
  const [overflows, setOverflows] = useState(false)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const [userPaused, setUserPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)

  const reducedMotion = usePrefersReducedMotion()
  const tabHidden = useTabHidden()

  // Um toque na tela não dispara `pointerenter`, então o gesto de arrastar não
  // seria coberto pela pausa por ponteiro: sem isto, o avanço automático
  // brigaria com o dedo do usuário no meio do arrasto.
  const lastInteraction = useRef(0)

  const sync = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    // Margem de 1px: com zoom do navegador ou largura fracionária, o fim da
    // rolagem cai em 0.5px de diferença e o botão nunca desabilitaria.
    const maxScroll = track.scrollWidth - track.clientWidth
    setOverflows(maxScroll > 1)
    setAtStart(track.scrollLeft <= 1)
    setAtEnd(track.scrollLeft >= maxScroll - 1)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    sync()
    track.addEventListener('scroll', sync, { passive: true })

    // A quantidade de itens visíveis muda com a largura da janela e com a
    // chegada dos dados — o ResizeObserver cobre os dois casos.
    const observer = new ResizeObserver(sync)
    observer.observe(track)
    for (const child of track.children) observer.observe(child)

    return () => {
      track.removeEventListener('scroll', sync)
      observer.disconnect()
    }
  }, [sync, children])

  const scrollBy = useCallback(
    (direction) => {
      const track = trackRef.current
      if (!track) return
      track.scrollBy({
        // Uma "página" por passo: avança o que está visível, mantendo um item
        // de referência em vez de saltar para um trecho sem relação.
        left: direction * track.clientWidth * 0.9,
        behavior: reducedMotion ? 'auto' : 'smooth',
      })
    },
    [reducedMotion],
  )

  const running = autoPlay && overflows && !reducedMotion && !userPaused && !hovered && !focused && !tabHidden

  useEffect(() => {
    if (!running) return

    const timer = setInterval(() => {
      const track = trackRef.current
      if (!track) return

      // Arrastou há pouco: cede a vez ao usuário e tenta no próximo ciclo.
      if (Date.now() - lastInteraction.current < interval) return

      const maxScroll = track.scrollWidth - track.clientWidth
      const behavior = reducedMotion ? 'auto' : 'smooth'

      if (track.scrollLeft >= maxScroll - 1) {
        track.scrollTo({ left: 0, behavior })
      } else {
        track.scrollBy({ left: track.clientWidth * 0.9, behavior })
      }
    }, interval)

    return () => clearInterval(timer)
  }, [running, interval, reducedMotion])

  function handleManualScroll(direction) {
    lastInteraction.current = Date.now()
    scrollBy(direction)
  }

  // O automático só se anuncia quando pode de fato acontecer: sem transbordo
  // ou sob movimento reduzido, o botão de pausa não teria o que pausar.
  const showPause = autoPlay && overflows && !reducedMotion

  return (
    <div
      className={cn('relative', className)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      <div
        ref={trackRef}
        role="group"
        aria-label={label}
        onPointerDown={() => {
          lastInteraction.current = Date.now()
        }}
        onTouchStart={() => {
          lastInteraction.current = Date.now()
        }}
        className={cn(
          'scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth',
          // Espaço para a sombra e o anel de foco dos cartões não serem
          // cortados pelo `overflow` do trilho.
          '-mx-1 px-1 py-1',
          trackClassName,
        )}
      >
        {children}
      </div>

      {overflows ? (
        <div className="mt-4 flex items-center justify-end gap-2">
          {showPause ? (
            <button
              type="button"
              onClick={() => setUserPaused((paused) => !paused)}
              aria-pressed={userPaused}
              className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground hover:border-brand/35 focus-visible:ring-ring/30 mr-auto flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium shadow-subtle transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {userPaused ? (
                <Play className="size-3.5" aria-hidden="true" />
              ) : (
                <Pause className="size-3.5" aria-hidden="true" />
              )}
              {userPaused ? 'Retomar' : 'Pausar'}
              <span className="sr-only">a passagem automática das categorias</span>
            </button>
          ) : null}

          <CarouselButton
            direction="prev"
            disabled={atStart}
            onClick={() => handleManualScroll(-1)}
          />
          <CarouselButton
            direction="next"
            disabled={atEnd}
            onClick={() => handleManualScroll(1)}
          />
        </div>
      ) : null}
    </div>
  )
}

function CarouselButton({ direction, disabled, onClick }) {
  const isPrev = direction === 'prev'
  const Icon = isPrev ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrev ? 'Ver itens anteriores' : 'Ver próximos itens'}
      className="border-border bg-card text-foreground hover:bg-muted hover:border-brand/35 focus-visible:ring-ring/30 flex size-9 items-center justify-center rounded-md border shadow-subtle transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}

/**
 * Item do trilho. A largura em porcentagem deixa o próximo cartão "espiando"
 * na borda — a pista visual de que há mais conteúdo para o lado, que uma
 * fileira exatamente preenchida não dá.
 */
export function CarouselItem({ className, children }) {
  return (
    <div className={cn('shrink-0 snap-start', 'w-[82%] sm:w-[46%] lg:w-[31.5%]', className)}>
      {children}
    </div>
  )
}
