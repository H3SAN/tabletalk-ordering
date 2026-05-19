DROP FUNCTION IF EXISTS public.get_restaurant_by_qr(text);

CREATE OR REPLACE FUNCTION public.get_restaurant_by_qr(_qr_token text)
RETURNS TABLE(
  restaurant_id uuid,
  branch_id uuid,
  table_id uuid,
  table_number text,
  restaurant_name text,
  restaurant_slug text,
  branch_name text,
  branch_slug text,
  primary_color text,
  logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id AS restaurant_id,
    b.id AS branch_id,
    t.id AS table_id,
    t.table_number,
    r.name AS restaurant_name,
    r.slug AS restaurant_slug,
    b.name AS branch_name,
    b.slug AS branch_slug,
    r.primary_color,
    r.logo_url
  FROM public.tables t
  JOIN public.branches b ON b.id = t.branch_id
  JOIN public.restaurants r ON r.id = b.restaurant_id
  WHERE t.qr_token = _qr_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_restaurant_by_qr(text) TO anon, authenticated;