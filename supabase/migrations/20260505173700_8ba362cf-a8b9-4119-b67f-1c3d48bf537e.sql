
-- Enable realtime for service_requests (idempotent)
do $$
begin
  begin
    alter publication supabase_realtime add table public.service_requests;
  exception when duplicate_object then null;
  end;
end $$;

-- Growth stats
create or replace function public.platform_growth_stats()
returns table(day date, new_restaurants bigint, new_branches bigint, new_orders bigint)
language sql stable security definer set search_path = public
as $$
  with days as (
    select (current_date - i)::date as day
    from generate_series(0, 29) i
  )
  select
    d.day,
    coalesce((select count(*) from public.restaurants r where r.created_at::date = d.day), 0),
    coalesce((select count(*) from public.branches b where b.created_at::date = d.day), 0),
    coalesce((select count(*) from public.orders o where o.created_at::date = d.day), 0)
  from days d
  where public.is_platform_admin(auth.uid())
  order by d.day
$$;

-- Revenue stats (estimated GMV from order_items)
create or replace function public.platform_revenue_stats()
returns table(day date, orders_count bigint, revenue numeric)
language sql stable security definer set search_path = public
as $$
  with days as (
    select (current_date - i)::date as day from generate_series(0, 29) i
  )
  select
    d.day,
    coalesce((select count(distinct o.id) from public.orders o where o.created_at::date = d.day), 0),
    coalesce((
      select sum(oi.unit_price * oi.quantity)
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.created_at::date = d.day
    ), 0)
  from days d
  where public.is_platform_admin(auth.uid())
  order by d.day
$$;

-- Top restaurants by orders in last 7 days
create or replace function public.platform_top_restaurants(_limit int default 10)
returns table(id uuid, name text, slug text, primary_color text, logo_url text, orders_week bigint)
language sql stable security definer set search_path = public
as $$
  select r.id, r.name, r.slug, r.primary_color, r.logo_url,
    (select count(*) from public.orders o
      where o.restaurant_id = r.id and o.created_at >= now() - interval '7 days') as orders_week
  from public.restaurants r
  where public.is_platform_admin(auth.uid())
  order by orders_week desc, r.created_at desc
  limit _limit
$$;

-- Recent signups
create or replace function public.platform_recent_signups(_limit int default 8)
returns table(id uuid, name text, slug text, created_at timestamptz, owner_email text, primary_color text, logo_url text)
language sql stable security definer set search_path = public
as $$
  select r.id, r.name, r.slug, r.created_at,
    (select u.email from auth.users u where u.id = r.owner_user_id) as owner_email,
    r.primary_color, r.logo_url
  from public.restaurants r
  where public.is_platform_admin(auth.uid())
  order by r.created_at desc
  limit _limit
$$;

-- Branches list (all tenants)
create or replace function public.platform_list_branches()
returns table(id uuid, name text, slug text, address text, active boolean, created_at timestamptz,
              restaurant_id uuid, restaurant_name text, restaurant_slug text,
              table_count bigint, orders_total bigint)
language sql stable security definer set search_path = public
as $$
  select b.id, b.name, b.slug, b.address, b.active, b.created_at,
    r.id, r.name, r.slug,
    (select count(*) from public.tables t where t.branch_id = b.id),
    (select count(*) from public.orders o where o.branch_id = b.id)
  from public.branches b
  join public.restaurants r on r.id = b.restaurant_id
  where public.is_platform_admin(auth.uid())
  order by b.created_at desc
$$;

-- Users list (all signed-up users)
create or replace function public.platform_list_users(_q text default null)
returns table(user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz,
              is_platform_admin boolean, restaurants jsonb)
language sql stable security definer set search_path = public
as $$
  select u.id, u.email::text, u.created_at, u.last_sign_in_at,
    exists(select 1 from public.platform_admins pa where pa.user_id = u.id),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'restaurant_id', s.restaurant_id,
        'restaurant_name', r.name,
        'role', s.role,
        'active', s.active
      ))
      from public.staff_users s
      join public.restaurants r on r.id = s.restaurant_id
      where s.user_id = u.id
    ), '[]'::jsonb)
  from auth.users u
  where public.is_platform_admin(auth.uid())
    and (_q is null or _q = '' or u.email ilike '%' || _q || '%')
  order by u.created_at desc
  limit 200
$$;

-- Recent cross-tenant service requests
create or replace function public.platform_recent_service_requests(_limit int default 50)
returns table(id uuid, type text, status text, created_at timestamptz,
              restaurant_id uuid, restaurant_name text,
              branch_id uuid, branch_name text,
              table_id uuid, table_number text)
language sql stable security definer set search_path = public
as $$
  select sr.id, sr.type::text, sr.status::text, sr.created_at,
    r.id, r.name, b.id, b.name, t.id, t.table_number
  from public.service_requests sr
  join public.restaurants r on r.id = sr.restaurant_id
  join public.branches b on b.id = sr.branch_id
  join public.tables t on t.id = sr.table_id
  where public.is_platform_admin(auth.uid())
  order by sr.created_at desc
  limit _limit
$$;

-- Suspend / reactivate restaurant
create or replace function public.platform_toggle_restaurant_active(_restaurant_id uuid, _active boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  update public.restaurants set active = _active where id = _restaurant_id;
end $$;

-- Grant platform admin
create or replace function public.platform_grant_admin(_user_id uuid, _note text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare _email text;
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select email into _email from auth.users where id = _user_id;
  insert into public.platform_admins (user_id, email, note)
  values (_user_id, _email, _note)
  on conflict do nothing;
end $$;

-- Revoke platform admin
create or replace function public.platform_revoke_admin(_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  -- prevent removing the last admin
  if (select count(*) from public.platform_admins) <= 1 then
    raise exception 'Cannot remove the last platform admin';
  end if;
  delete from public.platform_admins where user_id = _user_id;
end $$;
