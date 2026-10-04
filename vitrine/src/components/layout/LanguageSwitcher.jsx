import { ChevronDown } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCurrentPageLanguages, useLocale } from '@/contexts/LocaleContext'
import { DEFAULT_LOCALE, isSupportedLocale, LOCALE_CODES, LOCALES } from '@/i18n/config'
import { cn } from '@/lib/utils'

/*
 * Bandeiras em SVG, e não emoji. O Windows não desenha emoji de bandeira: 🇧🇷
 * aparece como as letras "BR" num quadrado, e o seletor ficaria com cara de
 * quebrado para boa parte de quem acessa de um computador. Os desenhos são
 * simplificados de propósito — em 21 × 14 px, estrelas e brasão viram ruído.
 *
 * São sempre decorativas: o nome do idioma vai escrito ao lado, e o leitor de
 * tela ouve o nome, nunca a bandeira.
 */
function FlagBR() {
  return (
    <svg viewBox="0 0 30 20" focusable="false">
      <rect width="30" height="20" fill="#009b3a" />
      <path d="M15 2.4 27.4 10 15 17.6 2.6 10Z" fill="#fedf00" />
      <circle cx="15" cy="10" r="4.9" fill="#002776" />
      <path d="M10.3 9.1c3.2-.9 6.9-.4 9.4 1.5" stroke="#fff" strokeWidth="1" fill="none" />
    </svg>
  )
}

function FlagUS() {
  const stripe = 20 / 13
  return (
    <svg viewBox="0 0 30 20" focusable="false">
      <rect width="30" height="20" fill="#b22234" />
      {[1, 3, 5, 7, 9, 11].map((row) => (
        <rect key={row} y={row * stripe} width="30" height={stripe} fill="#fff" />
      ))}
      <rect width="12" height={stripe * 7} fill="#3c3b6e" />
    </svg>
  )
}

function FlagES() {
  return (
    <svg viewBox="0 0 30 20" focusable="false">
      <rect width="30" height="20" fill="#aa151b" />
      <rect y="5" width="30" height="10" fill="#f1bf00" />
    </svg>
  )
}

const FLAGS = { br: FlagBR, us: FlagUS, es: FlagES }

export function LanguageFlag({ code, className }) {
  const Flag = FLAGS[code]
  if (!Flag) return null
  return (
    <span className={cn('lang-flag', className)} aria-hidden="true">
      <Flag />
    </span>
  )
}

/**
 * Seletor de idioma do cabeçalho: "🇧🇷 PT ▾", e a lista com o nome de cada
 * idioma escrito nele mesmo.
 *
 * O Radix cuida do teclado (Enter, Espaço e setas abrem e percorrem; Esc
 * fecha e devolve o foco ao botão) e anuncia a opção marcada: os itens são
 * `menuitemradio` com `aria-checked`. Cada nome leva o `lang` do próprio
 * idioma, para o leitor de tela pronunciar "English" em inglês.
 *
 * O nome acessível do botão CONTÉM o texto visível ("PT"): quem navega por
 * voz fala o que vê na tela, e o critério 2.5.3 do WCAG exige que funcione.
 *
 * Escolher um idioma grava a preferência e, numa página que existe em mais de
 * um idioma, leva à mesma notícia no idioma escolhido. Sem tradução naquele
 * idioma, leva ao original em português — o recuo "es → pt-BR" —, e nunca a
 * uma URL de idioma que não existe. Nas demais páginas o endereço não muda:
 * só a interface troca de língua.
 */
export function LanguageSwitcher({ tinted = false, className }) {
  const { locale, t, setLocale } = useLocale()
  const languages = useCurrentPageLanguages()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const current = LOCALES[locale] ?? LOCALES[DEFAULT_LOCALE]

  function handleChange(next) {
    if (!isSupportedLocale(next)) return
    setLocale(next)

    const target = languages?.[next] ?? languages?.[DEFAULT_LOCALE]
    if (target && target !== pathname) navigate(target)
  }

  // `modal={false}`: no modo modal o Radix trava a rolagem da página enquanto
  // o menu está aberto, e no Windows a barra de rolagem some e volta — a tela
  // dava um tranco justo no momento da troca de idioma.
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn('language-trigger', tinted && 'text-current', className)}
          aria-label={t('language.trigger', { language: current.label, code: current.short })}
        >
          <LanguageFlag code={current.flag} />
          <span className="language-code">{current.short}</span>
          <ChevronDown className="d-none d-sm-inline-block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={locale} onValueChange={handleChange}>
          {LOCALE_CODES.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} lang={code}>
              <LanguageFlag code={LOCALES[code].flag} />
              {LOCALES[code].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
