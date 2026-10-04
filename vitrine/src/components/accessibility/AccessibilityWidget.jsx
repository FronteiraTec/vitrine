import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Accessibility, Contrast, Hand, Minus, Plus, RotateCcw, Waves } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { VLibrasWidget } from './VLibrasWidget'
import { useVLibrasStatus } from '@/hooks/use-vlibras'
import { openVLibras } from '@/lib/vlibras'
import { useAccessibilityPreferences } from '@/hooks/use-accessibility'
import { useLocale } from '@/contexts/LocaleContext'
import { FONT_SCALES } from '@/lib/a11y'
import { cn } from '@/lib/utils'

/**
 * Painel de acessibilidade do leitor.
 *
 * Fica à ESQUERDA da tela de propósito: o VLibras desenha o próprio gatilho
 * fixo à direita, e dois botões flutuantes no mesmo canto se sobreporiam.
 *
 * Todos os controles são `<button>` de verdade com `aria-pressed`, e não
 * `div role="switch"`. Botão nativo já traz foco, ativação por Enter e Espaço,
 * e anúncio de estado — reimplementar isso com ARIA só cria oportunidade de
 * errar. Mesma razão do `<select>` nativo na leitura em voz alta.
 */

/** Botão de liga/desliga com estado anunciado ao leitor de tela. */
function ToggleRow({ icon: Icon, label, hint, pressed, onClick }) {
  const { t } = useLocale()

  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'border d-flex w-100 align-items-start gap-2 rounded-2 px-2 py-2 text-start',
        pressed ? 'border-primary bg-primary-subtle text-primary-emphasis' : '',
      )}
    >
      <Icon className="mt-1 icon flex-shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-grow-1">
        <span className="d-block fs-7 fw-medium">{label}</span>
        {hint ? <span className="text-body-secondary d-block fs-8">{hint}</span> : null}
      </span>
      {/* O estado não é transmitido só pela cor: o rótulo textual acompanha,
          como o critério 1.4.1 do WCAG exige. */}
      <span
        className={cn(
          'flex-shrink-0 rounded-pill px-2 py-1 fw-semibold',
          pressed ? 'bg-primary text-white' : 'bg-body-secondary text-body-secondary',
        )}
      >
        {pressed ? t('a11yPanel.on') : t('a11yPanel.off')}
      </span>
    </button>
  )
}

function LibrasRow({ enabled, onToggle }) {
  const status = useVLibrasStatus()
  const { t } = useLocale()

  const hint =
    status === 'loading'
      ? t('a11yPanel.librasLoading')
      : status === 'error'
        ? t('a11yPanel.librasError')
        : enabled
          ? t('a11yPanel.librasOn')
          : t('a11yPanel.librasOff')

  return (
    <div className="space-y-2">
      <ToggleRow
        icon={Hand}
        label={t('a11yPanel.libras')}
        hint={hint}
        pressed={enabled}
        onClick={onToggle}
      />

      {/* O gatilho que o plugin desenha é uma `div` sem foco de teclado. Este
          botão existe para que o recurso seja alcançável por Tab. */}
      {enabled && status === 'ready' ? (
        <Button type="button" variant="outline" size="sm" className="w-100" onClick={openVLibras}>
          {t('a11yPanel.librasOpen')}
        </Button>
      ) : null}

      <p aria-live="polite" className="visually-hidden">
        {status === 'loading' ? t('a11yPanel.librasLoadingStatus') : ''}
        {status === 'ready' && enabled ? t('a11yPanel.librasReady') : ''}
        {status === 'error' ? t('a11yPanel.librasFailed') : ''}
      </p>
    </div>
  )
}

function FontSizeControl({ value, onIncrease, onDecrease, onReset }) {
  const { t } = useLocale()
  const index = FONT_SCALES.findIndex((item) => item.value === value)
  const current = FONT_SCALES[index] ?? FONT_SCALES[0]

  return (
    <div className="border rounded-2 px-2 py-2">
      <div className="d-flex align-items-center justify-content-between gap-2">
        <span className="fs-7 fw-medium">{t('a11yPanel.fontSize')}</span>
        <span className="text-body-secondary fs-8">{t(`a11yPanel.fontScales.${current.value}`)}</span>
      </div>

      <div className="mt-2 d-flex align-items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onDecrease}
          disabled={index <= 0}
          aria-label={t('a11yPanel.fontDecrease')}
        >
          <Minus aria-hidden="true" />
        </Button>

        {/* Régua de quatro degraus: informa a posição sem depender da cor,
            porque o degrau atual também aparece escrito acima. */}
        <span className="d-flex flex-grow-1 align-items-center gap-1" aria-hidden="true">
          {FONT_SCALES.map((item, position) => (
            <span
              key={item.value}
              className={cn(
                'h-fx-1 flex-grow-1 rounded-pill',
                position <= index ? 'bg-primary' : 'bg-body-secondary',
              )}
            />
          ))}
        </span>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onIncrease}
          disabled={index >= FONT_SCALES.length - 1}
          aria-label={t('a11yPanel.fontIncrease')}
        >
          <Plus aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onReset}
          disabled={index === 0}
          aria-label={t('a11yPanel.fontReset')}
        >
          <RotateCcw aria-hidden="true" />
        </Button>
      </div>

      <p aria-live="polite" className="visually-hidden">
        {t('a11yPanel.fontStatus', { size: t(`a11yPanel.fontScales.${current.value}`) })}
      </p>
    </div>
  )
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false)
  const { t, rich } = useLocale()
  const { preferences, set, increaseFont, decreaseFont, resetFont, toggleContrast, toggleMotion } =
    useAccessibilityPreferences()

  return (
    <>
      <VLibrasWidget enabled={preferences.libras} />

      <div className="fab-bottom-start d-print-none">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              className="shadow h-fx-12 w-fx-12 rounded-pill"
              aria-label={t('a11yPanel.open')}
            >
              <Accessibility aria-hidden="true" className="icon-xl" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            side="top"
            align="start"
            aria-label={t('a11yPanel.label')}
            className="p-3"
          >
            <div className="space-y-2">
              <div>
                <h2 className="fs-7 fw-semibold">{t('a11yPanel.title')}</h2>
                <p className="text-body-secondary fs-8">{t('a11yPanel.saved')}</p>
              </div>

              <FontSizeControl
                value={preferences.fontScale}
                onIncrease={increaseFont}
                onDecrease={decreaseFont}
                onReset={resetFont}
              />

              <ToggleRow
                icon={Contrast}
                label={t('a11yPanel.contrast')}
                hint={t('a11yPanel.contrastHint')}
                pressed={preferences.contrast === 'high'}
                onClick={toggleContrast}
              />

              <ToggleRow
                icon={Waves}
                label={t('a11yPanel.motion')}
                hint={t('a11yPanel.motionHint')}
                pressed={preferences.motion === 'reduced'}
                onClick={toggleMotion}
              />

              <LibrasRow
                enabled={preferences.libras}
                onToggle={() => set({ libras: !preferences.libras })}
              />

              <p className="text-body-secondary border border-top pt-2 fs-8">
                {rich('a11yPanel.footer', {
                  link: (text) => (
                    <Link
                      to="/acessibilidade"
                      className="text-primary text-decoration-underline"
                      onClick={() => setOpen(false)}
                    >
                      {text}
                    </Link>
                  ),
                })}
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  )
}
