create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'customer'
    check (role in ('admin', 'barber', 'customer')),
  barber_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_house_style_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_house_style_admin() from public;
grant execute on function public.is_house_style_admin() to authenticated;

drop policy if exists "Users read their own profile or admins read all" on public.profiles;
create policy "Users read their own profile or admins read all"
  on public.profiles
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_house_style_admin()));

drop policy if exists "Users update their own profile or admins update profiles" on public.profiles;
create policy "Users update their own profile or admins update profiles"
  on public.profiles
  for update
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_house_style_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_house_style_admin()));

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;

create or replace function public.create_house_style_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'customer'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_house_style_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_house_style_profile on auth.users;
create trigger on_auth_user_created_house_style_profile
  after insert on auth.users
  for each row execute function public.create_house_style_profile();
