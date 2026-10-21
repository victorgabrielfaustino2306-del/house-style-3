do $$
declare
  v_admin_id uuid;
  v_barber_id uuid;
  v_profile public.profiles%rowtype;
  v_license_id uuid;
begin
  if current_setting('app.house_style_allow_test_seed', true) is distinct from 'yes' then
    raise exception 'Bloqueado: execute apenas em um banco local descartável, após SET app.house_style_allow_test_seed = ''yes'' na mesma sessão.';
  end if;

  select p.user_id into v_admin_id
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.role = 'admin' and lower(u.email) = lower('admin@barbearia.com')
  limit 1;
  if v_admin_id is null then
    raise exception 'Crie e promova admin@barbearia.com no Supabase Auth antes de executar o seed.';
  end if;

  select p.* into v_profile
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.role = 'barber' and lower(u.email) = lower('barbeiro@barbearia.com')
  limit 1;
  if v_profile.user_id is null or nullif(trim(v_profile.barber_id), '') is null then
    raise exception 'Crie barbeiro@barbearia.com e vincule a um barbeiro antes de executar o seed.';
  end if;
  v_barber_id := v_profile.user_id;

  if exists (
    select 1 from public.barber_licenses l
    where l.barber_user_id = v_barber_id and l.status <> 'cancelled'
  ) or exists (
    select 1 from public.barber_licenses l
    where l.code_hash = encode(extensions.digest('BARBEIRO30', 'sha256'), 'hex')
  ) then
    raise exception 'Já existe uma licença ativa/pendente ou o código de teste já foi usado.';
  end if;

  insert into public.barber_licenses (
    barber_user_id, barber_id, barber_name, code_hash, code_last4, created_by
  ) values (
    v_barber_id,
    v_profile.barber_id,
    v_profile.full_name,
    encode(extensions.digest('BARBEIRO30', 'sha256'), 'hex'),
    'RO30',
    v_admin_id
  )
  returning id into v_license_id;

  insert into public.barber_license_events (license_id, action, actor_user_id, details)
  values (
    v_license_id,
    'generated',
    v_admin_id,
    jsonb_build_object('seed', 'local-development-only')
  );
end;
$$;
