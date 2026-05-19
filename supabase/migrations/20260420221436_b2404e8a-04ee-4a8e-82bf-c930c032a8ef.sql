-- 1) Set search_path on trigger function
CREATE OR REPLACE FUNCTION public.orders_status_timestamps()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' AND NEW.accepted_at IS NULL THEN NEW.accepted_at = now(); END IF;
  IF NEW.status = 'ready' AND OLD.status <> 'ready' AND NEW.ready_at IS NULL THEN NEW.ready_at = now(); END IF;
  IF NEW.status = 'served' AND OLD.status <> 'served' AND NEW.served_at IS NULL THEN NEW.served_at = now(); END IF;
  RETURN NEW;
END;
$$;

-- 2) Validation function: confirms a (restaurant_id, branch_id, table_id) triple is valid and active
CREATE OR REPLACE FUNCTION public.is_valid_table_for_branch(_restaurant_id uuid, _branch_id uuid, _table_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tables t
    JOIN public.branches b ON b.id = t.branch_id
    JOIN public.restaurants r ON r.id = t.restaurant_id
    WHERE t.id = _table_id
      AND t.branch_id = _branch_id
      AND t.restaurant_id = _restaurant_id
      AND t.active = true AND b.active = true AND r.active = true
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_valid_table_for_branch(uuid, uuid, uuid) TO anon, authenticated;

-- 3) Replace permissive insert policies
DROP POLICY IF EXISTS "anyone insert orders" ON public.orders;
CREATE POLICY "anyone insert orders" ON public.orders FOR INSERT TO anon, authenticated
  WITH CHECK (
    public.is_valid_table_for_branch(restaurant_id, branch_id, table_id)
    AND status = 'pending'
    AND char_length(customer_session_id) BETWEEN 8 AND 128
  );

DROP POLICY IF EXISTS "anyone insert order items" ON public.order_items;
CREATE POLICY "anyone insert order items" ON public.order_items FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.restaurant_id = order_items.restaurant_id
        AND o.branch_id = order_items.branch_id
    )
    AND quantity > 0 AND quantity <= 99
  );

DROP POLICY IF EXISTS "anyone create service requests" ON public.service_requests;
CREATE POLICY "anyone create service requests" ON public.service_requests FOR INSERT TO anon, authenticated
  WITH CHECK (
    public.is_valid_table_for_branch(restaurant_id, branch_id, table_id)
    AND status = 'pending'
    AND char_length(customer_session_id) BETWEEN 8 AND 128
  );