create extension if not exists pgcrypto with schema extensions;

create table if not exists public.barber_licenses (
  id uuid primary key default gen_random_uuid(),
  barber_user_id uuid not null references auth.users (id) on delete restrict,
  barber_id text not null,
  barber_name text not null,
  code_hash text not null unique,
  code_last4 text not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'blocked', 'cancelled')),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id),
  activated_at timestamptz,
  expires_at timestamptz,
  last_renewed_at timestamptz,
  last_renewed_by uuid references auth.users (id),
  constraint barber_license_activation_state check (
    (status = 'pending' and activated_at is null and expires_at is null)
    or (status = 'cancelled')
    or (status in ('active', 'blocked') and activated_at is not null and expires_at is not null)
  )
);

create unique index if not exists barber_licenses_one_current_per_user
  on public.barber_licenses (barber_user_id)
  where status <> 'cancelled';

create unique index if not exists barber_licenses_one_current_per_barber
  on public.barber_licenses (barber_id)
  where status <> 'cancelled';

create table if not exists public.barber_license_events (
  id bigint generated always as identity primary key,
  license_id uuid not null references public.barber_licenses (id) on delete restrict,
  action text not null
    check (action in ('generated', 'activated', 'renewed', 'blocked', 'unblocked', 'cancelled')),
  actor_user_id uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

create index if not exists barber_license_events_history
  on public.barber_license_events (license_id, created_at desc);

alter table public.barber_licenses enable row level security;
alter table public.barber_license_events enable row level security;
revoke all on table public.barber_licenses, public.barber_license_events from anon, authenticated;

create or replace function public.admin_list_license_accounts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.role = 'admin'
  ) then
    raise exception 'Apenas administradores podem consultar contas de licença.';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', p.user_id,
      'email', u.email,
      'full_name', p.full_name,
      'role', p.role,
      'barber_id', p.barber_id
    ) order by p.full_name)
    from public.profiles p
    join auth.users u on u.id = p.user_id
    where p.role in ('customer', 'barber')
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_assign_barber(
  p_user_id uuid,
  p_barber_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.role = 'admin'
  ) then
    raise exception 'Apenas administradores podem vincular barbeiros.';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'Não é permitido alterar o próprio perfil por esta operação.';
  end if;
  if nullif(trim(p_barber_id), '') is null then
    raise exception 'Selecione um barbeiro cadastrado.';
  end if;

  select * into v_profile
  from public.profiles p
  where p.user_id = p_user_id
  for update;
  if not found or v_profile.role not in ('customer', 'barber') then
    raise exception 'A conta selecionada não pode ser vinculada como barbeiro.';
  end if;
  if exists (
    select 1 from public.profiles p
    where p.role = 'barber'
      and p.barber_id = trim(p_barber_id)
      and p.user_id <> p_user_id
  ) then
    raise exception 'Esta ficha já está vinculada a outra conta.';
  end if;
  if exists (
    select 1 from public.barber_licenses l
    where l.barber_user_id = p_user_id
      and l.status <> 'cancelled'
      and l.barber_id <> trim(p_barber_id)
  ) then
    raise exception 'Cancele a licença existente antes de alterar o vínculo do barbeiro.';
  end if;

  update public.profiles
  set role = 'barber', barber_id = trim(p_barber_id)
  where user_id = p_user_id;

  return jsonb_build_object('user_id', p_user_id, 'full_name', v_profile.full_name, 'role', 'barber');
end;
$$;

create or replace function public.admin_generate_barber_license(p_barber_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_code text;
  v_license_id uuid;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.role = 'admin'
  ) then
    raise exception 'Apenas administradores podem gerar licenças.';
  end if;

  select * into v_profile
  from public.profiles p
  where p.user_id = p_barber_user_id and p.role = 'barber'
  for update;
  if not found or nullif(trim(v_profile.barber_id), '') is null then
    raise exception 'Vincule a conta a um barbeiro antes de gerar a licença.';
  end if;
  if exists (
    select 1 from public.barber_licenses l
    where l.barber_user_id = p_barber_user_id and l.status <> 'cancelled'
  ) then
    raise exception 'Esta conta já possui uma licença. Cancele-a explicitamente antes de gerar outra.';
  end if;
  if exists (
    select 1 from public.barber_licenses l
    where l.barber_id = v_profile.barber_id and l.status <> 'cancelled'
  ) then
    raise exception 'Esta ficha de barbeiro já possui uma licença ativa.';
  end if;

  v_code := 'HS-' || upper(encode(extensions.gen_random_bytes(16), 'hex'));
  insert into public.barber_licenses (
    barber_user_id, barber_id, barber_name, code_hash, code_last4, created_by
  ) values (
    p_barber_user_id,
    v_profile.barber_id,
    v_profile.full_name,
    encode(extensions.digest(v_code, 'sha256'), 'hex'),
    right(v_code, 4),
    (select auth.uid())
  )
  returning id into v_license_id;

  insert into public.barber_license_events (license_id, action, actor_user_id)
  values (v_license_id, 'generated', (select auth.uid()));

  return jsonb_build_object('license_id', v_license_id, 'code', v_code);
end;
$$;

create or replace function public.activate_my_barber_license(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_license public.barber_licenses%rowtype;
begin
  if v_user_id is null then
    raise exception 'Entre na sua conta antes de ativar uma licença.';
  end if;
  if not exists (
    select 1 from public.profiles p where p.user_id = v_user_id and p.role = 'barber'
  ) then
    raise exception 'Somente uma conta vinculada a um barbeiro pode ativar este código.';
  end if;

  select * into v_license
  from public.barber_licenses l
  where l.code_hash = encode(extensions.digest(upper(trim(coalesce(p_code, ''))), 'sha256'), 'hex')
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  if v_license.barber_user_id <> v_user_id then
    return jsonb_build_object('ok', false, 'status', 'wrong_account');
  end if;
  if v_license.status = 'blocked' then
    return jsonb_build_object('ok', false, 'status', 'blocked');
  end if;
  if v_license.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'status', 'cancelled');
  end if;
  if v_license.status = 'active' then
    if v_license.expires_at <= now() then
      return jsonb_build_object('ok', false, 'status', 'expired');
    end if;
    return jsonb_build_object('ok', true, 'status', 'active');
  end if;

  update public.barber_licenses
  set status = 'active', activated_at = now(), expires_at = now() + interval '30 days'
  where id = v_license.id;
  insert into public.barber_license_events (license_id, action, actor_user_id)
  values (v_license.id, 'activated', v_user_id);

  return jsonb_build_object('ok', true, 'status', 'active');
end;
$$;

create or replace function public.my_barber_license_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_license public.barber_licenses%rowtype;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'É necessário entrar na conta.';
  end if;
  if exists (select 1 from public.profiles p where p.user_id = v_user_id and p.role = 'admin') then
    return jsonb_build_object('status', 'permanent');
  end if;
  if not exists (select 1 from public.profiles p where p.user_id = v_user_id and p.role = 'barber') then
    return jsonb_build_object('status', 'not_barber');
  end if;

  select * into v_license
  from public.barber_licenses l
  where l.barber_user_id = v_user_id
  order by l.created_at desc
  limit 1;
  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  v_status := case
    when v_license.status = 'active' and v_license.expires_at <= now() then 'expired'
    else v_license.status
  end;
  return jsonb_build_object(
    'status', v_status,
    'license_id', v_license.id,
    'barber_name', v_license.barber_name,
    'activated_at', v_license.activated_at,
    'expires_at', v_license.expires_at,
    'days_remaining', case
      when v_license.expires_at is null then null
      when v_license.expires_at <= statement_timestamp()
        then -greatest(1, ceil(extract(epoch from (statement_timestamp() - v_license.expires_at)) / 86400)::integer)
      else ceil(extract(epoch from (v_license.expires_at - statement_timestamp())) / 86400)::integer
    end,
    'last_renewed_at', v_license.last_renewed_at
  );
end;
$$;

create or replace function public.admin_list_barber_licenses()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.role = 'admin'
  ) then
    raise exception 'Apenas administradores podem consultar licenças.';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'license_id', l.id,
      'user_id', p.user_id,
      'email', u.email,
      'barber_name', l.barber_name,
      'barber_id', l.barber_id,
      'code_last4', l.code_last4,
      'status', case when l.status = 'active' and l.expires_at <= now() then 'expired' else l.status end,
      'days_remaining', case
        when l.expires_at is null then null
        when l.expires_at <= statement_timestamp()
          then -greatest(1, ceil(extract(epoch from (statement_timestamp() - l.expires_at)) / 86400)::integer)
        else ceil(extract(epoch from (l.expires_at - statement_timestamp())) / 86400)::integer
      end,
      'created_at', l.created_at,
      'activated_at', l.activated_at,
      'expires_at', l.expires_at,
      'last_renewed_at', l.last_renewed_at
    ) order by l.created_at desc)
    from public.barber_licenses l
    join public.profiles p on p.user_id = l.barber_user_id
    join auth.users u on u.id = p.user_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_renew_barber_license(p_license_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_license public.barber_licenses%rowtype;
  v_expiration timestamptz;
  v_actor uuid := (select auth.uid());
begin
  if not exists (
    select 1 from public.profiles p where p.user_id = v_actor and p.role = 'admin'
  ) then
    raise exception 'Apenas administradores podem renovar licenças.';
  end if;

  select * into v_license from public.barber_licenses l where l.id = p_license_id for update;
  if not found then raise exception 'Licença não encontrada.'; end if;
  if v_license.status in ('cancelled', 'pending') then
    raise exception 'Licenças pendentes ou canceladas não podem ser renovadas.';
  end if;

  v_expiration := greatest(v_license.expires_at, now()) + interval '30 days';
  update public.barber_licenses
  set status = 'active', expires_at = v_expiration,
      last_renewed_at = now(), last_renewed_by = v_actor
  where id = p_license_id;
  insert into public.barber_license_events (license_id, action, actor_user_id, details)
  values (p_license_id, 'renewed', v_actor, jsonb_build_object('expires_at', v_expiration));

  return jsonb_build_object('status', 'active', 'expires_at', v_expiration);
end;
$$;

create or replace function public.admin_change_barber_license_status(
  p_license_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_license public.barber_licenses%rowtype;
  v_actor uuid := (select auth.uid());
  v_new_status text;
begin
  if not exists (
    select 1 from public.profiles p where p.user_id = v_actor and p.role = 'admin'
  ) then
    raise exception 'Apenas administradores podem alterar licenças.';
  end if;
  if p_action is null or p_action not in ('block', 'unblock', 'cancel') then
    raise exception 'Ação de licença inválida.';
  end if;

  select * into v_license from public.barber_licenses l where l.id = p_license_id for update;
  if not found then raise exception 'Licença não encontrada.'; end if;
  if v_license.status = 'cancelled' then raise exception 'Uma licença cancelada não pode ser reativada.'; end if;
  if p_action = 'unblock' and (v_license.status <> 'blocked' or v_license.expires_at <= now()) then
    raise exception 'Só é possível desbloquear uma licença bloqueada e ainda válida.';
  end if;
  if p_action = 'block' and v_license.status <> 'active' then
    raise exception 'Esta licença não pode ser bloqueada no estado atual.';
  end if;

  v_new_status := case p_action when 'block' then 'blocked' when 'unblock' then 'active' else 'cancelled' end;
  update public.barber_licenses set status = v_new_status where id = p_license_id;
  insert into public.barber_license_events (license_id, action, actor_user_id)
  values (
    p_license_id,
    case p_action when 'block' then 'blocked' when 'unblock' then 'unblocked' else 'cancelled' end,
    v_actor
  );

  return jsonb_build_object('status', v_new_status);
end;
$$;

create or replace function public.admin_barber_license_history(p_license_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.role = 'admin'
  ) then
    raise exception 'Apenas administradores podem consultar o histórico.';
  end if;

  if not exists (select 1 from public.barber_licenses l where l.id = p_license_id) then
    raise exception 'Licença não encontrada.';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'action', e.action,
      'actor_email', u.email,
      'created_at', e.created_at,
      'details', e.details
    ) order by e.created_at desc)
    from public.barber_license_events e
    join auth.users u on u.id = e.actor_user_id
    where e.license_id = p_license_id
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_list_license_accounts() from public, anon;
revoke all on function public.admin_assign_barber(uuid, text) from public, anon;
revoke all on function public.admin_generate_barber_license(uuid) from public, anon;
revoke all on function public.activate_my_barber_license(text) from public, anon;
revoke all on function public.my_barber_license_status() from public, anon;
revoke all on function public.admin_list_barber_licenses() from public, anon;
revoke all on function public.admin_renew_barber_license(uuid) from public, anon;
revoke all on function public.admin_change_barber_license_status(uuid, text) from public, anon;
revoke all on function public.admin_barber_license_history(uuid) from public, anon;

grant execute on function public.admin_list_license_accounts() to authenticated;
grant execute on function public.admin_assign_barber(uuid, text) to authenticated;
grant execute on function public.admin_generate_barber_license(uuid) to authenticated;
grant execute on function public.activate_my_barber_license(text) to authenticated;
grant execute on function public.my_barber_license_status() to authenticated;
grant execute on function public.admin_list_barber_licenses() to authenticated;
grant execute on function public.admin_renew_barber_license(uuid) to authenticated;
grant execute on function public.admin_change_barber_license_status(uuid, text) to authenticated;
grant execute on function public.admin_barber_license_history(uuid) to authenticated;
