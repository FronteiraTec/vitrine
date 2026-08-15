import { Briefcase, Camera, Code2, Globe2, Link2, MessageCircle, PlayCircle } from 'lucide-react'

/**
 * Ícones por tipo de link.
 *
 * São glifos genéricos, e não logotipos de marca: o lucide removeu os ícones
 * de marcas na v1, e reproduzir logotipos de terceiros traria questões de uso
 * de marca sem ganho real — o rótulo do link já diz qual é a rede.
 */
const ICONS = {
  website: Globe2,
  instagram: Camera,
  linkedin: Briefcase,
  youtube: PlayCircle,
  github: Code2,
  facebook: MessageCircle,
  other: Link2,
}

export function LinkIcon({ type, className }) {
  const Icon = ICONS[type] ?? Link2
  return <Icon className={className} aria-hidden="true" />
}
