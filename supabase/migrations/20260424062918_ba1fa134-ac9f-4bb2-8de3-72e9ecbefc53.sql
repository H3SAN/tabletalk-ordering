CREATE OR REPLACE FUNCTION public.get_branch_tables(_restaurant_slug text, _branch_slug text)
 RETURNS TABLE(restaurant_id uuid, branch_id uuid, table_id uuid, table_number text, qr_token text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, b.id, t.id, t.table_number, t.qr_token
  FROM public.restaurants r
  JOIN public.branches b ON b.restaurant_id = r.id
  JOIN public.tables t ON t.branch_id = b.id
  WHERE r.slug = _restaurant_slug AND b.slug = _branch_slug
    AND r.active AND b.active AND t.active
  ORDER BY t.table_number;
$function$;