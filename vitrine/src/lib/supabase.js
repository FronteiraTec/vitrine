import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Só a URL e a chave anônima (pública) vivem no frontend — nunca a service
 * role key. Toda a autorização é feita por Row Level Security no Postgres.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null

/**
 * Acesso ao client garantindo mensagem clara quando o ambiente não foi
 * configurado, em vez de um `TypeError` genérico em runtime.
 */
export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local.',
    )
  }
  return supabase
}

/** Converte erros do PostgREST/Auth em mensagens legíveis em português. */
export function friendlyError(error) {
  if (!error) return 'Ocorreu um erro inesperado.'
  const message = String(error.message ?? error)

  const map = [
    [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/email not confirmed/i, 'Confirme seu e-mail antes de entrar.'],
    [/user already registered/i, 'Já existe uma conta com este e-mail.'],
    [/password should be at least/i, 'A senha deve ter no mínimo 8 caracteres.'],
    [/duplicate key value.*slug/i, 'Já existe um registro com este slug. Escolha outro nome.'],
    [/duplicate key value/i, 'Este registro já existe.'],
    [/violates foreign key/i, 'Existe um vínculo impedindo esta operação.'],
    [/violates row-level security|permission denied/i, 'Você não tem permissão para esta ação.'],
    [/transição de status/i, message],
    [/failed to fetch|network/i, 'Falha de conexão. Verifique sua internet e tente novamente.'],
    [/jwt expired/i, 'Sua sessão expirou. Entre novamente.'],
    [/rate limit/i, 'Muitas tentativas. Aguarde alguns instantes.'],
  ]

  for (const [pattern, friendly] of map) {
    if (pattern.test(message)) return friendly
  }
  return message
}
