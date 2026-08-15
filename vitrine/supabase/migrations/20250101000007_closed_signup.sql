-- =============================================================================
-- Vitrine — 0007 | Cadastro fechado
--
-- O autocadastro deixa de ser a porta de entrada: contas passam a ser criadas
-- por um administrador, em /admin/usuarios.
--
-- Sobra um caso que não pode ser fechado, sob pena de tornar a instalação
-- inutilizável: a PRIMEIRA conta. Sem ninguém no banco não há administrador
-- para criar administrador. A tela /criar-conta continua existindo só para esse
-- momento e se fecha sozinha assim que o primeiro admin existe.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- installation_has_admin — a pergunta que a tela de cadastro faz antes de se
-- mostrar.
--
-- SECURITY DEFINER porque quem pergunta é anônimo, e o RLS de `profiles` não
-- concede leitura alguma ao papel `anon`. A função devolve um booleano e nada
-- mais: não vaza quantos usuários existem, nem quem são.
--
-- `is_active` entra na conta de propósito. Uma instalação cujo único admin foi
-- desativado está tão travada quanto uma vazia, e nesse caso reabrir o cadastro
-- inicial é a saída menos ruim.
-- -----------------------------------------------------------------------------
create or replace function public.installation_has_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
     where role = 'admin' and is_active
  );
$$;

comment on function public.installation_has_admin() is
  'Existe ao menos um administrador ativo? Libera a tela de cadastro inicial enquanto não houver.';

revoke all on function public.installation_has_admin() from public;
grant execute on function public.installation_has_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Trava no banco, não só na interface
--
-- Esconder /criar-conta no React não impede ninguém de chamar o endpoint de
-- signup do GoTrue direto. A defesa de verdade é desligar o cadastro aberto no
-- painel do Supabase (Authentication → Providers → Email → "Allow new users to
-- sign up"), o que este arquivo NÃO consegue fazer — é configuração do serviço
-- de autenticação, fora do alcance do SQL.
--
-- O que dá para garantir aqui é o efeito: uma conta criada por fora do fluxo
-- administrativo nasce inerte. `handle_new_user` passa a marcar como INATIVO
-- todo perfil que não seja o primeiro da instalação, então mesmo que alguém
-- consiga se cadastrar, não enxerga nem escreve nada — `is_staff()` exige
-- `is_active`. Um administrador ativa quem deve entrar.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role     public.user_role;
  v_is_first boolean;
begin
  select count(*) = 0 into v_is_first from public.profiles;

  -- A primeira conta da instalação vira administradora e já nasce ativa; as
  -- demais entram como editoras e inativas, aguardando liberação.
  v_role := case when v_is_first then 'admin' else 'editor' end::public.user_role;

  insert into public.profiles (id, name, email, role, is_active)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    new.email,
    v_role,
    v_is_first
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
