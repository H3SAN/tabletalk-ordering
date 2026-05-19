
-- 1. Add customer identity columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_whatsapp text;

-- Backfill existing rows so the not-null + length checks below pass
UPDATE public.orders
SET customer_name = COALESCE(NULLIF(btrim(customer_name), ''), 'Guest')
WHERE customer_name IS NULL OR btrim(customer_name) = '';

UPDATE public.orders
SET customer_whatsapp = COALESCE(NULLIF(btrim(customer_whatsapp), ''), 'unknown')
WHERE customer_whatsapp IS NULL OR btrim(customer_whatsapp) = '';

ALTER TABLE public.orders
  ALTER COLUMN customer_name SET NOT NULL,
  ALTER COLUMN customer_whatsapp SET NOT NULL;

-- 2. Update insert RLS to require non-empty identity fields with sensible bounds
DROP POLICY IF EXISTS "anyone insert orders" ON public.orders;

CREATE POLICY "anyone insert orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  is_valid_table_for_branch(restaurant_id, branch_id, table_id)
  AND status = 'pending'::order_status
  AND char_length(customer_session_id) BETWEEN 8 AND 128
  AND char_length(btrim(customer_name)) BETWEEN 1 AND 80
  AND char_length(btrim(customer_whatsapp)) BETWEEN 8 AND 20
);

-- 3. Index for fast recovery lookups
CREATE INDEX IF NOT EXISTS idx_orders_recovery
  ON public.orders (branch_id, table_id, lower(customer_name), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_recovery_whatsapp
  ON public.orders (branch_id, table_id, customer_whatsapp, created_at DESC);

-- 4. Recovery RPC: customer types name OR whatsapp on QR page, gets their recent orders
CREATE OR REPLACE FUNCTION public.find_my_orders(_qr_token text, _query text)
RETURNS TABLE (
  order_id uuid,
  order_number integer,
  status text,
  customer_name text,
  created_at timestamptz,
  total numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ctx AS (
    SELECT t.restaurant_id, t.branch_id, t.id AS table_id
    FROM public.tables t
    WHERE t.qr_token = _qr_token AND t.active
    LIMIT 1
  )
  SELECT
    o.id,
    o.order_number,
    o.status::text,
    o.customer_name,
    o.created_at,
    COALESCE((SELECT SUM(oi.unit_price * oi.quantity) FROM public.order_items oi WHERE oi.order_id = o.id), 0)
  FROM public.orders o
  JOIN ctx ON ctx.restaurant_id = o.restaurant_id
          AND ctx.branch_id = o.branch_id
          AND ctx.table_id = o.table_id
  WHERE o.created_at >= now() - interval '4 hours'
    AND (
      lower(o.customer_name) = lower(btrim(_query))
      OR regexp_replace(o.customer_whatsapp, '\D', '', 'g') = regexp_replace(btrim(_query), '\D', '', 'g')
    )
    AND char_length(btrim(_query)) >= 2
  ORDER BY o.created_at DESC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.find_my_orders(text, text) TO anon, authenticated;

-- 5. Helper for the "order ready" WhatsApp notification (server fn reads from this)
CREATE OR REPLACE FUNCTION public.get_order_notification_payload(_order_id uuid)
RETURNS TABLE (
  order_id uuid,
  order_number integer,
  status text,
  customer_name text,
  customer_whatsapp text,
  restaurant_name text,
  table_number text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.order_number,
    o.status::text,
    o.customer_name,
    o.customer_whatsapp,
    r.name,
    t.table_number
  FROM public.orders o
  JOIN public.restaurants r ON r.id = o.restaurant_id
  JOIN public.tables t ON t.id = o.table_id
  WHERE o.id = _order_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_order_notification_payload(uuid) FROM PUBLIC, anon, authenticated;
