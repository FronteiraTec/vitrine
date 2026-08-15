import { useState } from 'react'
import { Briefcase, Check, Link2, MessageCircle, Send } from 'lucide-react'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

/**
 * Compartilhamento da notícia.
 *
 * Os ícones são glifos genéricos, e não logotipos — mesma decisão já tomada em
 * `LinkIcon`: o lucide removeu as marcas na v1 e o rótulo ao lado já diz qual é
 * a rede. Aqui isso ajuda duas vezes, porque botão de compartilhar sem texto
 * vira adivinhação para quem usa leitor de tela.
 *
 * Tudo são links comuns (`https://…`), sem SDK de rede social. Um script de
 * terceiro nesta página levaria junto o histórico de leitura de quem visita a
 * vitrine, o que não se paga por um botão de compartilhar.
 */
export function ShareBar({ title, className }) {
  const [copied, setCopied] = useState(false)

  const url = window.location.href
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title ?? '')

  const targets = [
    {
      label: 'WhatsApp',
      icon: Send,
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      label: 'Facebook',
      icon: MessageCircle,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: 'LinkedIn',
      icon: Briefcase,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
  ]

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copiado.')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard exige contexto seguro e permissão; sem isso o usuário ainda
      // tem a barra de endereços, então o aviso explica em vez de só falhar.
      toast.error('Não foi possível copiar. Use o endereço da barra do navegador.')
    }
  }

  const itemClass =
    'text-muted-foreground hover:border-brand/40 hover:text-brand border-border inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors'

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-muted-foreground mr-1 text-xs font-semibold tracking-wide uppercase">
        Compartilhe
      </span>

      {targets.map(({ label, icon: Icon, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className={itemClass}
          aria-label={`Compartilhar no ${label}`}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {label}
        </a>
      ))}

      <button type="button" onClick={handleCopy} className={itemClass}>
        {copied ? (
          <Check className="size-3.5" aria-hidden="true" />
        ) : (
          <Link2 className="size-3.5" aria-hidden="true" />
        )}
        {copied ? 'Copiado' : 'Copiar link'}
      </button>
    </div>
  )
}
