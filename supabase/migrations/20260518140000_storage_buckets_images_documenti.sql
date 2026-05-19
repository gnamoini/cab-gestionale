-- Bucket Supabase Storage per immagini (mezzi, magazzino, lavorazioni) e documenti PDF/allegati.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images',
  'images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/jpg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit)
values (
  'documenti',
  'documenti',
  true,
  52428800
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- --- images: solo utenti autenticati; path {mezzi|magazzino|lavorazioni}/{recordId}/file ---

drop policy if exists cab_images_select on storage.objects;
create policy cab_images_select
on storage.objects for select to authenticated
using (bucket_id = 'images');

drop policy if exists cab_images_insert on storage.objects;
create policy cab_images_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] in ('mezzi', 'magazzino', 'lavorazioni')
  and coalesce((storage.foldername(name))[2], '') <> ''
);

drop policy if exists cab_images_update on storage.objects;
create policy cab_images_update
on storage.objects for update to authenticated
using (bucket_id = 'images')
with check (bucket_id = 'images');

drop policy if exists cab_images_delete on storage.objects;
create policy cab_images_delete
on storage.objects for delete to authenticated
using (bucket_id = 'images');

-- --- documenti: upload/delete autenticati; bucket pubblico per URL diretti (path con UUID) ---

drop policy if exists cab_documenti_select on storage.objects;
create policy cab_documenti_select
on storage.objects for select to authenticated
using (bucket_id = 'documenti');

drop policy if exists cab_documenti_insert on storage.objects;
create policy cab_documenti_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'documenti'
  and coalesce((storage.foldername(name))[1], '') <> ''
);

drop policy if exists cab_documenti_update on storage.objects;
create policy cab_documenti_update
on storage.objects for update to authenticated
using (bucket_id = 'documenti')
with check (bucket_id = 'documenti');

drop policy if exists cab_documenti_delete on storage.objects;
create policy cab_documenti_delete
on storage.objects for delete to authenticated
using (bucket_id = 'documenti');
