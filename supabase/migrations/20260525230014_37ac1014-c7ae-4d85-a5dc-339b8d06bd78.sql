
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

create policy "menu images public read"
on storage.objects for select
using (bucket_id = 'menu-images');

create policy "staff upload menu images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'menu-images'
  and public.is_restaurant_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

create policy "staff update menu images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'menu-images'
  and public.is_restaurant_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

create policy "staff delete menu images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'menu-images'
  and public.is_restaurant_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
