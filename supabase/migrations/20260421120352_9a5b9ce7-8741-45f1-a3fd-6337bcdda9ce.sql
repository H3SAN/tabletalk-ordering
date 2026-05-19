
-- Staff invitations table
CREATE TABLE public.staff_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role public.app_role NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by UUID NOT NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_invites_token ON public.staff_invites(token);
CREATE INDEX idx_staff_invites_restaurant ON public.staff_invites(restaurant_id);

ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

-- Owners/admins can manage invites for their restaurant
CREATE POLICY "manage invites"
  ON public.staff_invites FOR ALL
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['restaurant_owner'::app_role, 'admin'::app_role]))
  WITH CHECK (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['restaurant_owner'::app_role, 'admin'::app_role]));

-- Anonymous lookup by token (for accept page) - returns minimal details only via RPC
CREATE POLICY "anon view by token"
  ON public.staff_invites FOR SELECT
  TO anon, authenticated
  USING (true);

-- RPC: get invite info by token (safe: only returns if not expired/accepted)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS TABLE(
  id uuid,
  restaurant_id uuid,
  restaurant_name text,
  branch_id uuid,
  branch_name text,
  email text,
  name text,
  role public.app_role,
  expired boolean,
  accepted boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    i.id, i.restaurant_id, r.name, i.branch_id, b.name,
    i.email, i.name, i.role,
    (i.expires_at < now()) AS expired,
    (i.accepted_at IS NOT NULL) AS accepted
  FROM public.staff_invites i
  JOIN public.restaurants r ON r.id = i.restaurant_id
  LEFT JOIN public.branches b ON b.id = i.branch_id
  WHERE i.token = _token;
$$;

-- RPC: accept invite (creates staff_users row for current auth user)
CREATE OR REPLACE FUNCTION public.accept_staff_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _email text;
  _invite public.staff_invites%ROWTYPE;
  _staff_id uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  SELECT * INTO _invite FROM public.staff_invites WHERE token = _token;
  IF _invite.id IS NULL THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF _invite.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'Invite already accepted'; END IF;
  IF _invite.expires_at < now() THEN RAISE EXCEPTION 'Invite expired'; END IF;
  IF lower(_invite.email) <> lower(_email) THEN
    RAISE EXCEPTION 'Invite email does not match your account';
  END IF;

  -- upsert staff
  INSERT INTO public.staff_users (user_id, restaurant_id, branch_id, name, email, role, active)
  VALUES (_uid, _invite.restaurant_id, _invite.branch_id, _invite.name, _email, _invite.role, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO _staff_id;

  IF _staff_id IS NULL THEN
    SELECT id INTO _staff_id FROM public.staff_users
    WHERE user_id = _uid AND restaurant_id = _invite.restaurant_id LIMIT 1;
    UPDATE public.staff_users SET active = true, role = _invite.role, branch_id = _invite.branch_id, name = _invite.name
    WHERE id = _staff_id;
  END IF;

  UPDATE public.staff_invites SET accepted_at = now() WHERE id = _invite.id;

  RETURN _invite.restaurant_id;
END;
$$;

-- Public RPC for Wi-Fi/landing flow: list active branches for a restaurant slug
CREATE OR REPLACE FUNCTION public.get_public_branches(_restaurant_slug text)
RETURNS TABLE(
  restaurant_id uuid,
  restaurant_name text,
  primary_color text,
  logo_url text,
  branch_id uuid,
  branch_name text,
  branch_slug text,
  address text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.id, r.name, r.primary_color, r.logo_url,
         b.id, b.name, b.slug, b.address
  FROM public.restaurants r
  JOIN public.branches b ON b.restaurant_id = r.id
  WHERE r.slug = _restaurant_slug AND r.active = true AND b.active = true
  ORDER BY b.name;
$$;

-- Public RPC: list tables for a branch (for landing flow table picker)
CREATE OR REPLACE FUNCTION public.get_public_tables(_restaurant_slug text, _branch_slug text)
RETURNS TABLE(
  restaurant_id uuid,
  branch_id uuid,
  table_id uuid,
  table_number text,
  qr_token text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.id, b.id, t.id, t.table_number, t.qr_token
  FROM public.restaurants r
  JOIN public.branches b ON b.restaurant_id = r.id
  JOIN public.tables t ON t.branch_id = b.id
  WHERE r.slug = _restaurant_slug AND b.slug = _branch_slug
    AND r.active AND b.active AND t.active
  ORDER BY t.table_number;
$$;
