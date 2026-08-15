import { friendlyError, requireSupabase } from '@/lib/supabase'

const COLUMNS = `
  id,
  brand_name, brand_tagline, logo_url,
  header_bg, header_fg, header_border, header_sticky, header_show_search, header_nav,
  footer_bg, footer_fg, footer_description, footer_partners_label, footer_partners,
  footer_social, footer_show_categories, footer_contact_email, footer_contact_phone,
  footer_address, footer_copyright, footer_note,
  primary_color, brand_color,
  updated_at, updated_by
`

/**
 * A linha única de `site_settings`.
 *
 * `maybeSingle` e não `single`: uma instalação que ainda não rodou a migration
 * 0005 devolveria erro em vez de `null`, e o cabeçalho é renderizado em toda
 * página — a vitrine cairia inteira por causa de uma configuração ausente.
 * Sem a linha, os defaults do código assumem.
 */
export async function getSiteSettings() {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('site_settings').select(COLUMNS).maybeSingle()

  if (error) {
    // Tabela inexistente: mesma leitura de "ainda não configurado".
    if (/does not exist|schema cache/i.test(error.message)) return null
    throw new Error(friendlyError(error))
  }
  return data
}

/**
 * Grava a linha única. O `id` é sempre `true` — ver o singleton descrito em
 * `supabase/migrations/20250101000005_site_settings.sql`.
 */
export async function updateSiteSettings(values) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('site_settings')
    .update(values)
    .eq('id', true)
    .select(COLUMNS)
    .single()

  if (error) {
    if (/violates check constraint.*colors_are_hex/i.test(error.message)) {
      throw new Error('Alguma cor está em formato inválido. Use hexadecimal, como #145c33.')
    }
    throw new Error(friendlyError(error))
  }
  return data
}
