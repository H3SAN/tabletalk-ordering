INSERT INTO public.platform_admins (user_id, email, note)
SELECT u.id, u.email, 'Initial platform owner'
FROM auth.users u
WHERE u.email = 'genivevepignosis@gmail.com'
ON CONFLICT (user_id) DO NOTHING;