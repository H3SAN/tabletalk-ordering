CREATE OR REPLACE FUNCTION public.create_restaurant_workspace(_name text, _slug text, _primary_color text, _branch_name text, _address text)
 RETURNS TABLE(restaurant_id uuid, branch_id uuid, slug text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid;
  _email text;
  _name_meta text;
  _r_id uuid;
  _b_id uuid;
  _normalized_slug text;
  _branch_slug text;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF _name IS NULL OR length(btrim(_name)) = 0 THEN
    RAISE EXCEPTION 'Restaurant name is required' USING ERRCODE = '22023';
  END IF;
  IF _slug IS NULL OR length(btrim(_slug)) = 0 THEN
    RAISE EXCEPTION 'Slug is required' USING ERRCODE = '22023';
  END IF;
  IF _branch_name IS NULL OR length(btrim(_branch_name)) = 0 THEN
    RAISE EXCEPTION 'Branch name is required' USING ERRCODE = '22023';
  END IF;

  _normalized_slug := lower(btrim(_slug));
  _branch_slug := lower(regexp_replace(btrim(_branch_name), '[^a-zA-Z0-9]+', '-', 'g'));

  IF EXISTS (SELECT 1 FROM public.restaurants r WHERE r.owner_user_id = _uid) THEN
    RAISE EXCEPTION 'You already own a restaurant' USING ERRCODE = '23505';
  END IF;

  IF EXISTS (SELECT 1 FROM public.restaurants r WHERE r.slug = _normalized_slug) THEN
    RAISE EXCEPTION 'That slug is already taken' USING ERRCODE = '23505';
  END IF;

  SELECT u.email, COALESCE(u.raw_user_meta_data->>'name', u.email)
  INTO _email, _name_meta
  FROM auth.users u
  WHERE u.id = _uid;

  INSERT INTO public.restaurants (name, slug, primary_color, owner_user_id)
  VALUES (btrim(_name), _normalized_slug, COALESCE(_primary_color, '#0ea5e9'), _uid)
  RETURNING public.restaurants.id INTO _r_id;

  INSERT INTO public.staff_users (user_id, restaurant_id, name, email, role, active)
  VALUES (_uid, _r_id, COALESCE(_name_meta, _email, 'Owner'), COALESCE(_email, ''), 'restaurant_owner', true);

  INSERT INTO public.branches (restaurant_id, name, slug, address)
  VALUES (_r_id, btrim(_branch_name), _branch_slug, NULLIF(btrim(COALESCE(_address, '')), ''))
  RETURNING public.branches.id INTO _b_id;

  RETURN QUERY SELECT _r_id AS restaurant_id, _b_id AS branch_id, _normalized_slug AS slug;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_restaurant_context()
 RETURNS TABLE(restaurant_id uuid, name text, slug text, primary_color text, logo_url text, role app_role, is_owner boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id AS restaurant_id,
         r.name AS name,
         r.slug AS slug,
         r.primary_color AS primary_color,
         r.logo_url AS logo_url,
         COALESCE(s.role, 'restaurant_owner'::app_role) AS role,
         (r.owner_user_id = auth.uid()) AS is_owner
  FROM public.restaurants r
  LEFT JOIN public.staff_users s
    ON s.restaurant_id = r.id AND s.user_id = auth.uid() AND s.active = true
  WHERE r.owner_user_id = auth.uid()
     OR EXISTS (
       SELECT 1 FROM public.staff_users s2
       WHERE s2.restaurant_id = r.id AND s2.user_id = auth.uid() AND s2.active = true
     )
  ORDER BY (r.owner_user_id = auth.uid()) DESC
  LIMIT 1;
$function$;