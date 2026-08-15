/**
 * Cria uma conta de acesso à Vitrine.
 *
 * Existe porque criar usuário exige a `service_role key`, que ignora todo o RLS
 * e por isso não pode viver no frontend. A chave fica aqui, no servidor, e o
 * navegador só consegue pedir a criação — nunca executá-la por conta própria.
 *
 * Duas checagens independentes protegem a rota:
 *   1. `verify_jwt` (padrão das Edge Functions) recusa quem não tem sessão;
 *   2. o código abaixo confirma, no banco, que quem pediu é administrador ATIVO.
 *
 * A segunda não é redundante: um JWT válido apenas prova que a pessoa está
 * logada, não que ela pode criar contas.
 *
 * Deploy:  supabase functions deploy criar-usuario
 * As variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetadas
 * automaticamente pelo Supabase — não é preciso configurar segredo algum.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Origens autorizadas, separadas por vírgula:
 *
 *   supabase secrets set ALLOWED_ORIGINS="https://vitrine.exemplo.com,http://localhost:5173"
 *
 * Sem a variável definida, cai em `*`. Isso preserva o funcionamento de quem já
 * publicou a função antes desta mudança, mas convém configurar: com `*`,
 * qualquer página da web pode disparar a requisição.
 *
 * Vale dizer o que o CORS NÃO faz aqui — ele não é a proteção da rota. O token
 * de sessão precisa ser anexado explicitamente pelo cliente e não viaja sozinho
 * entre origens, então a defesa real continua sendo o `verify_jwt` mais a
 * checagem de administrador feita abaixo. O CORS é camada extra.
 */
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin') ?? ''
  const allowed =
    ALLOWED_ORIGINS.length === 0 ? '*' : ALLOWED_ORIGINS.includes(origin) ? origin : ''

  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (allowed) headers['Access-Control-Allow-Origin'] = allowed
  // Origens diferentes recebem respostas diferentes: sem isto, um cache
  // intermediário poderia servir a uma origem o cabeçalho liberado para outra.
  if (ALLOWED_ORIGINS.length > 0) headers['Vary'] = 'Origin'
  return headers
}

const ROLES = ['admin', 'editor', 'reviewer']
const MIN_PASSWORD = 8

Deno.serve(async (request) => {
  const CORS = corsHeaders(request)

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Função mal configurada: credenciais ausentes.' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  /* ---------------------------------------------------------------------- */
  /* Quem está pedindo?                                                      */
  /* ---------------------------------------------------------------------- */

  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Sessão ausente.' }, 401)

  const { data: caller, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !caller?.user) return json({ error: 'Sessão inválida.' }, 401)

  const { data: callerProfile, error: profileError } = await admin
    .from('profiles')
    .select('role, is_active')
    .eq('id', caller.user.id)
    .maybeSingle()

  if (profileError) return json({ error: 'Não foi possível verificar suas permissões.' }, 500)

  if (!callerProfile?.is_active || callerProfile.role !== 'admin') {
    return json({ error: 'Apenas administradores criam contas.' }, 403)
  }

  /* ---------------------------------------------------------------------- */
  /* Validação                                                               */
  /* ---------------------------------------------------------------------- */

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Corpo da requisição inválido.' }, 400)
  }

  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const role = String(body.role ?? 'editor')

  if (!name) return json({ error: 'Informe o nome.' }, 400)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'E-mail inválido.' }, 400)
  if (password.length < MIN_PASSWORD) {
    return json({ error: `A senha deve ter no mínimo ${MIN_PASSWORD} caracteres.` }, 400)
  }
  if (!ROLES.includes(role)) return json({ error: 'Papel inválido.' }, 400)

  /* ---------------------------------------------------------------------- */
  /* Criação                                                                 */
  /* ---------------------------------------------------------------------- */

  // `email_confirm: true` porque quem cria é um administrador: exigir que a
  // pessoa confirme o e-mail antes de entrar só adicionaria uma dependência de
  // SMTP a um cadastro que já foi validado por alguém de dentro.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (createError) {
    const message = /already registered|already been registered/i.test(createError.message)
      ? 'Já existe uma conta com este e-mail.'
      : createError.message
    return json({ error: message }, 400)
  }

  const userId = created.user!.id

  /*
   * O gatilho `handle_new_user` já criou o perfil, como editor e INATIVO
   * (migration 0007). Aqui aplicamos o papel escolhido e ativamos — a conta
   * nasceu de uma decisão administrativa, então entra pronta para uso.
   *
   * Se este passo falhar, a conta de autenticação existiria sem acesso
   * utilizável e sem aparecer como pendente para ninguém. Melhor desfazer e
   * pedir para tentar de novo do que deixar um registro órfão.
   */
  const { error: roleError } = await admin
    .from('profiles')
    .update({ name, role, is_active: true })
    .eq('id', userId)

  if (roleError) {
    await admin.auth.admin.deleteUser(userId)
    return json({ error: 'Não foi possível definir o papel. Nenhuma conta foi criada.' }, 500)
  }

  return json({ id: userId, email, name, role }, 201)
})
