
drop function if exists public.platform_list_restaurants();

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  currency text not null default 'USD',
  billing_interval text not null default 'month',
  features jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscription_plans enable row level security;

create policy "view active plans" on public.subscription_plans
  for select to authenticated
  using (active = true or public.is_platform_admin(auth.uid()));
create policy "platform admins manage plans" on public.subscription_plans
  for all to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

create table public.restaurant_subscriptions (
  restaurant_id uuid primary key,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  status text not null default 'active',
  assigned_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.restaurant_subscriptions enable row level security;

create policy "members view own subscription" on public.restaurant_subscriptions
  for select to authenticated
  using (public.is_restaurant_member(auth.uid(), restaurant_id) or public.is_platform_admin(auth.uid()));
create policy "platform admins manage subscriptions" on public.restaurant_subscriptions
  for all to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

insert into public.subscription_plans (slug, name, description, price, billing_interval, features, sort_order, is_default) values
  ('free', 'Free', 'Get started with the basics.', 0, 'month',
    '["1 branch","Up to 10 tables","Basic menu management","QR ordering"]'::jsonb, 0, true),
  ('pro', 'Pro', 'For growing restaurants.', 29, 'month',
    '["Up to 5 branches","Unlimited tables","Kitchen display","Voice ordering","Email support"]'::jsonb, 1, false),
  ('business', 'Business', 'For multi-location operators.', 99, 'month',
    '["Unlimited branches","Advanced analytics","Priority support","Custom branding","API access"]'::jsonb, 2, false);

insert into public.restaurant_subscriptions (restaurant_id, plan_id)
select r.id, (select id from public.subscription_plans where is_default limit 1)
from public.restaurants r
on conflict do nothing;

create or replace function public.assign_default_plan()
returns trigger language plpgsql security definer set search_path = public as $$
declare _plan_id uuid;
begin
  select id into _plan_id from public.subscription_plans where is_default and active limit 1;
  if _plan_id is not null then
    insert into public.restaurant_subscriptions (restaurant_id, plan_id)
    values (new.id, _plan_id) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger restaurants_assign_default_plan after insert on public.restaurants
  for each row execute function public.assign_default_plan();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger plans_touch before update on public.subscription_plans
  for each row execute function public.touch_updated_at();
create trigger subs_touch before update on public.restaurant_subscriptions
  for each row execute function public.touch_updated_at();

create or replace function public.platform_list_plans()
returns setof public.subscription_plans
language sql stable security definer set search_path = public as $$
  select * from public.subscription_plans
  where public.is_platform_admin(auth.uid())
  order by sort_order, price
$$;

create or replace function public.platform_upsert_plan(
  _id uuid, _slug text, _name text, _description text, _price numeric,
  _currency text, _billing_interval text, _features jsonb, _sort_order int,
  _active boolean, _is_default boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare _result uuid;
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if _is_default then
    update public.subscription_plans set is_default = false where is_default = true;
  end if;
  if _id is null then
    insert into public.subscription_plans (slug, name, description, price, currency, billing_interval, features, sort_order, active, is_default)
    values (_slug, _name, _description, coalesce(_price,0), coalesce(_currency,'USD'), coalesce(_billing_interval,'month'), coalesce(_features,'[]'::jsonb), coalesce(_sort_order,0), coalesce(_active,true), coalesce(_is_default,false))
    returning id into _result;
  else
    update public.subscription_plans set
      slug = _slug, name = _name, description = _description,
      price = coalesce(_price,0), currency = coalesce(_currency,'USD'),
      billing_interval = coalesce(_billing_interval,'month'),
      features = coalesce(_features,'[]'::jsonb),
      sort_order = coalesce(_sort_order,0),
      active = coalesce(_active,true),
      is_default = coalesce(_is_default,false)
    where id = _id returning id into _result;
  end if;
  return _result;
end $$;

create or replace function public.platform_delete_plan(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if exists(select 1 from public.restaurant_subscriptions where plan_id = _id) then
    raise exception 'Cannot delete a plan that is assigned to restaurants. Reassign them first.';
  end if;
  delete from public.subscription_plans where id = _id;
end $$;

create or replace function public.platform_assign_plan(_restaurant_id uuid, _plan_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  insert into public.restaurant_subscriptions (restaurant_id, plan_id, assigned_by)
  values (_restaurant_id, _plan_id, auth.uid())
  on conflict (restaurant_id) do update set plan_id = excluded.plan_id, assigned_by = auth.uid(), updated_at = now();
end $$;

create or replace function public.platform_list_restaurants()
returns table(
  id uuid, name text, slug text, active boolean, primary_color text, logo_url text,
  created_at timestamptz, branch_count bigint, table_count bigint, orders_total bigint,
  plan_id uuid, plan_name text, plan_price numeric
)
language sql stable security definer set search_path = public as $$
  select
    r.id, r.name, r.slug, r.active, r.primary_color, r.logo_url, r.created_at,
    (select count(*) from public.branches b where b.restaurant_id = r.id),
    (select count(*) from public.tables t where t.restaurant_id = r.id),
    (select count(*) from public.orders o where o.restaurant_id = r.id),
    p.id, p.name, p.price
  from public.restaurants r
  left join public.restaurant_subscriptions rs on rs.restaurant_id = r.id
  left join public.subscription_plans p on p.id = rs.plan_id
  where public.is_platform_admin(auth.uid())
  order by r.created_at desc
$$;

create or replace function public.get_my_plan()
returns table(
  plan_id uuid, slug text, name text, description text, price numeric,
  currency text, billing_interval text, features jsonb, status text
)
language sql stable security definer set search_path = public as $$
  select p.id, p.slug, p.name, p.description, p.price, p.currency, p.billing_interval, p.features, rs.status
  from public.restaurants r
  join public.restaurant_subscriptions rs on rs.restaurant_id = r.id
  join public.subscription_plans p on p.id = rs.plan_id
  where r.owner_user_id = auth.uid()
     or exists (select 1 from public.staff_users s where s.restaurant_id = r.id and s.user_id = auth.uid() and s.active)
  limit 1
$$;
