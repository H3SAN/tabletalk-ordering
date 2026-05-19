-- ENUMS
CREATE TYPE public.app_role AS ENUM ('platform_owner','restaurant_owner','admin','branch_manager','kitchen','bar','waiter');
CREATE TYPE public.order_status AS ENUM ('pending','accepted','preparing','ready','served','cancelled');
CREATE TYPE public.station AS ENUM ('kitchen','bar','dessert');
CREATE TYPE public.service_request_type AS ENUM ('call_waiter','need_assistance','request_bill','table_help');
CREATE TYPE public.service_request_status AS ENUM ('pending','acknowledged','completed');

-- RESTAURANTS
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  primary_color text DEFAULT '#0ea5e9',
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_restaurants_owner ON public.restaurants(owner_user_id);

-- BRANCHES
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  address text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, slug)
);
CREATE INDEX idx_branches_restaurant ON public.branches(restaurant_id);

-- STAFF USERS
CREATE TABLE public.staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  role public.app_role NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, restaurant_id, role)
);
CREATE INDEX idx_staff_user ON public.staff_users(user_id);
CREATE INDEX idx_staff_restaurant ON public.staff_users(restaurant_id);

-- TABLES
CREATE TABLE public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  qr_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(branch_id, table_number)
);
CREATE INDEX idx_tables_branch ON public.tables(branch_id);
CREATE INDEX idx_tables_qr ON public.tables(qr_token);

-- MENU CATEGORIES
CREATE TABLE public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_restaurant ON public.menu_categories(restaurant_id);

-- MENU ITEMS
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  available boolean NOT NULL DEFAULT true,
  station public.station NOT NULL DEFAULT 'kitchen',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_items_restaurant ON public.menu_items(restaurant_id);
CREATE INDEX idx_items_category ON public.menu_items(category_id);

-- MODIFIERS
CREATE TABLE public.modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_delta numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_modifiers_item ON public.modifiers(menu_item_id);

-- ORDERS
CREATE SEQUENCE public.order_number_seq START 1000;
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  order_number int NOT NULL DEFAULT nextval('public.order_number_seq'),
  customer_session_id text NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz
);
CREATE INDEX idx_orders_restaurant_branch ON public.orders(restaurant_id, branch_id);
CREATE INDEX idx_orders_session ON public.orders(customer_session_id);
CREATE INDEX idx_orders_status ON public.orders(status);

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  item_name_snapshot text NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  selected_modifiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  special_instructions text,
  station public.station NOT NULL DEFAULT 'kitchen',
  station_status public.order_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- SERVICE REQUESTS
CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  customer_session_id text NOT NULL,
  type public.service_request_type NOT NULL,
  status public.service_request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX idx_service_branch ON public.service_requests(branch_id);

-- SECURITY DEFINER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_restaurant_owner(_user_id uuid, _restaurant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.restaurants WHERE id = _restaurant_id AND owner_user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.has_restaurant_role(_user_id uuid, _restaurant_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_users
    WHERE user_id = _user_id AND restaurant_id = _restaurant_id AND active = true AND role = ANY(_roles)
  ) OR public.is_restaurant_owner(_user_id, _restaurant_id);
$$;

CREATE OR REPLACE FUNCTION public.is_restaurant_member(_user_id uuid, _restaurant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_users WHERE user_id = _user_id AND restaurant_id = _restaurant_id AND active = true
  ) OR public.is_restaurant_owner(_user_id, _restaurant_id);
$$;

CREATE OR REPLACE FUNCTION public.get_restaurant_by_qr(_qr_token text)
RETURNS TABLE(restaurant_id uuid, branch_id uuid, table_id uuid, table_number text, restaurant_name text, restaurant_slug text, branch_name text, primary_color text, logo_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, b.id, t.id, t.table_number, r.name, r.slug, b.name, r.primary_color, r.logo_url
  FROM public.tables t
  JOIN public.branches b ON b.id = t.branch_id
  JOIN public.restaurants r ON r.id = t.restaurant_id
  WHERE t.qr_token = _qr_token AND t.active = true AND b.active = true AND r.active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_menu_for_qr(_qr_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _restaurant_id uuid;
  _branch_id uuid;
  result jsonb;
BEGIN
  SELECT t.restaurant_id, t.branch_id INTO _restaurant_id, _branch_id
  FROM public.tables t
  JOIN public.branches b ON b.id = t.branch_id
  JOIN public.restaurants r ON r.id = t.restaurant_id
  WHERE t.qr_token = _qr_token AND t.active = true AND b.active = true AND r.active = true;

  IF _restaurant_id IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'categories', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'sort_order', c.sort_order) ORDER BY c.sort_order, c.name)
      FROM public.menu_categories c
      WHERE c.restaurant_id = _restaurant_id AND (c.branch_id IS NULL OR c.branch_id = _branch_id)
    ), '[]'::jsonb),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'category_id', i.category_id, 'name', i.name, 'description', i.description,
        'price', i.price, 'image_url', i.image_url, 'available', i.available, 'station', i.station, 'sort_order', i.sort_order,
        'modifiers', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'price_delta', m.price_delta))
          FROM public.modifiers m WHERE m.menu_item_id = i.id
        ), '[]'::jsonb)
      ) ORDER BY i.sort_order, i.name)
      FROM public.menu_items i
      WHERE i.restaurant_id = _restaurant_id AND (i.branch_id IS NULL OR i.branch_id = _branch_id)
    ), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_menu_for_qr(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_restaurant_by_qr(text) TO anon, authenticated;

-- ENABLE RLS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "view restaurant" ON public.restaurants FOR SELECT USING (public.is_restaurant_member(auth.uid(), id));
CREATE POLICY "create restaurant" ON public.restaurants FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "update own restaurant" ON public.restaurants FOR UPDATE USING (auth.uid() = owner_user_id);
CREATE POLICY "delete own restaurant" ON public.restaurants FOR DELETE USING (auth.uid() = owner_user_id);

CREATE POLICY "view branches" ON public.branches FOR SELECT USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "manage branches" ON public.branches FOR ALL
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['restaurant_owner','admin']::public.app_role[]))
  WITH CHECK (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['restaurant_owner','admin']::public.app_role[]));

CREATE POLICY "view staff" ON public.staff_users FOR SELECT USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "manage staff" ON public.staff_users FOR ALL
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['restaurant_owner','admin']::public.app_role[]))
  WITH CHECK (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['restaurant_owner','admin']::public.app_role[]));

CREATE POLICY "view tables" ON public.tables FOR SELECT USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "manage tables" ON public.tables FOR ALL
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['restaurant_owner','admin','branch_manager']::public.app_role[]))
  WITH CHECK (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['restaurant_owner','admin','branch_manager']::public.app_role[]));

CREATE POLICY "view categories" ON public.menu_categories FOR SELECT USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "manage categories" ON public.menu_categories FOR ALL
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['restaurant_owner','admin']::public.app_role[]))
  WITH CHECK (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['restaurant_owner','admin']::public.app_role[]));

CREATE POLICY "view items" ON public.menu_items FOR SELECT USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "manage items" ON public.menu_items FOR ALL
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['restaurant_owner','admin','kitchen','bar']::public.app_role[]))
  WITH CHECK (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['restaurant_owner','admin','kitchen','bar']::public.app_role[]));

CREATE POLICY "view modifiers" ON public.modifiers FOR SELECT USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "manage modifiers" ON public.modifiers FOR ALL
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['restaurant_owner','admin']::public.app_role[]))
  WITH CHECK (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['restaurant_owner','admin']::public.app_role[]));

CREATE POLICY "staff view orders" ON public.orders FOR SELECT USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "staff update orders" ON public.orders FOR UPDATE USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "anon view orders" ON public.orders FOR SELECT TO anon USING (true);
CREATE POLICY "anyone insert orders" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "staff view order items" ON public.order_items FOR SELECT USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "staff update order items" ON public.order_items FOR UPDATE USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "anon view order items" ON public.order_items FOR SELECT TO anon USING (true);
CREATE POLICY "anyone insert order items" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "staff view service requests" ON public.service_requests FOR SELECT USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "staff update service requests" ON public.service_requests FOR UPDATE USING (public.is_restaurant_member(auth.uid(), restaurant_id));
CREATE POLICY "anon view service requests" ON public.service_requests FOR SELECT TO anon USING (true);
CREATE POLICY "anyone create service requests" ON public.service_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

-- TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.orders_status_timestamps()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' AND NEW.accepted_at IS NULL THEN NEW.accepted_at = now(); END IF;
  IF NEW.status = 'ready' AND OLD.status <> 'ready' AND NEW.ready_at IS NULL THEN NEW.ready_at = now(); END IF;
  IF NEW.status = 'served' AND OLD.status <> 'served' AND NEW.served_at IS NULL THEN NEW.served_at = now(); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_orders_status_timestamps BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_status_timestamps();

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.service_requests REPLICA IDENTITY FULL;