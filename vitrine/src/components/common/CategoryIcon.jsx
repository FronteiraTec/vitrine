import {
  Atom,
  Beaker,
  Bot,
  Briefcase,
  Building2,
  Cpu,
  Globe2,
  GraduationCap,
  HeartPulse,
  Landmark,
  Layers,
  Leaf,
  Lightbulb,
  Microscope,
  Palette,
  Rocket,
  Scale,
  Sprout,
  Users,
  Wrench,
  Zap,
} from 'lucide-react'

/**
 * Conjunto curado de ícones oferecido ao administrador.
 * É um mapa explícito, e não um import dinâmico do lucide inteiro: assim só
 * estes ícones entram no bundle.
 */
export const CATEGORY_ICONS = {
  microscope: { label: 'Microscópio', Icon: Microscope },
  beaker: { label: 'Béquer', Icon: Beaker },
  atom: { label: 'Átomo', Icon: Atom },
  cpu: { label: 'Processador', Icon: Cpu },
  bot: { label: 'Robô', Icon: Bot },
  lightbulb: { label: 'Lâmpada', Icon: Lightbulb },
  rocket: { label: 'Foguete', Icon: Rocket },
  users: { label: 'Pessoas', Icon: Users },
  'graduation-cap': { label: 'Formatura', Icon: GraduationCap },
  'building-2': { label: 'Prédio', Icon: Building2 },
  landmark: { label: 'Instituição', Icon: Landmark },
  leaf: { label: 'Folha', Icon: Leaf },
  sprout: { label: 'Broto', Icon: Sprout },
  'heart-pulse': { label: 'Saúde', Icon: HeartPulse },
  zap: { label: 'Energia', Icon: Zap },
  globe: { label: 'Globo', Icon: Globe2 },
  palette: { label: 'Design', Icon: Palette },
  briefcase: { label: 'Negócios', Icon: Briefcase },
  wrench: { label: 'Ferramenta', Icon: Wrench },
  scale: { label: 'Balança', Icon: Scale },
  layers: { label: 'Camadas', Icon: Layers },
}

export const ICON_OPTIONS = Object.entries(CATEGORY_ICONS).map(([value, { label, Icon }]) => ({
  value,
  label,
  Icon,
}))

export function CategoryIcon({ name, className, ...props }) {
  const entry = CATEGORY_ICONS[name] ?? CATEGORY_ICONS.layers
  const Icon = entry.Icon
  return <Icon className={className} aria-hidden="true" {...props} />
}
