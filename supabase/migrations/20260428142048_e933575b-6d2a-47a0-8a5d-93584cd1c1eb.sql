-- Platform Admins (OrderFlow AI super-admins)
create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text,
  note text,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- Security definer helper: is the current user a platform admin?
create or replace function public.is_platform_admin(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = _user_id
  )
$$;

-- Only platform admins can manage the table
drop policy if exists "platform admins read" on public.platform_admins;
create policy "platform admins read"
  on public.platform_admins
  for select
  to authenticated
  using (public.is_platform_admin(auth.uid()));

drop policy if exists "platform admins manage" on public.platform_admins;
create policy "platform admins manage"
  on public.platform_admins
  for all
  to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

-- Aggregated read for super-admin dashboard. Security definer so platform admins
-- can see all restaurants/branches counts without per-tenant membership.
create or replace function public.platform_overview()
returns table (
  total_restaurants bigint,
  active_restaurants bigint,
  total_branches bigint,
  active_branches bigint,
  total_tables bigint,
  orders_today bigint,
  orders_week bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.restaurants),
    (select count(*) from public.restaurants where active),
    (select count(*) from public.branches),
    (select count(*) from public.branches where active),
    (select count(*) from public.tables),
    (select count(*) from public.orders where created_at >= date_trunc('day', now())),
    (select count(*) from public.orders where created_at >= now() - interval '7 days')
  where public.is_platform_admin(auth.uid())
$$;

create or replace function public.platform_list_restaurants()
returns table (
  id uuid,
  name text,
  slug text,
  active boolean,
  primary_color text,
  logo_url text,
  created_at timestamptz,
  branch_count bigint,
  table_count bigint,
  orders_total bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id, r.name, r.slug, r.active, r.primary_color, r.logo_url, r.created_at,
    (select count(*) from public.branches b where b.restaurant_id = r.id) as branch_count,
    (select count(*) from public.tables t where t.restaurant_id = r.id) as table_count,
    (select count(*) from public.orders o where o.restaurant_id = r.id) as orders_total
  from public.restaurants r
  where public.is_platform_admin(auth.uid())
  order by r.created_at desc
$$;

grant execute on function public.is_platform_admin(uuid) to authenticated;
grant execute on function public.platform_overview() to authenticated;
grant execute on function public.platform_list_restaurants() to authenticated;