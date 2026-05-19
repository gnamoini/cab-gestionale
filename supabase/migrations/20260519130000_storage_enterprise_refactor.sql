-- Storage enterprise: policy unificate RBAC su bucket images + documenti.
-- Nessun parsing path (foldername, regex, split_part). Solo rbac_can_*_operational().

-- ---------------------------------------------------------------------------
-- 1. Bucket (idempotente)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2. Drop TUTTE le policy legacy su storage.objects (images / documenti)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

drop policy if exists cab_images_select on storage.objects;
drop policy if exists cab_images_insert on storage.objects;
drop policy if exists cab_images_update on storage.objects;
drop policy if exists cab_images_delete on storage.objects;
drop policy if exists cab_documenti_select on storage.objects;
drop policy if exists cab_documenti_insert on storage.objects;
drop policy if exists cab_documenti_update on storage.objects;
drop policy if exists cab_documenti_delete on storage.objects;
drop policy if exists rbac_storage_images on storage.objects;
drop policy if exists rbac_storage_documenti on storage.objects;
drop policy if exists "read images" on storage.objects;
drop policy if exists documents_bucket_read_members on storage.objects;
drop policy if exists documents_bucket_write_writers on storage.objects;
drop policy if exists documents_bucket_update_writers on storage.objects;
drop policy if exists documents_bucket_delete_writers on storage.objects;

-- ---------------------------------------------------------------------------
-- 3. Policy unificate — bucket images (4 operazioni, stesso RBAC ovunque)
-- ---------------------------------------------------------------------------
create policy rbac_storage_images_select on storage.objects
for select to authenticated
using (
  bucket_id = 'images'
  and public.rbac_can_read_operational()
);

create policy rbac_storage_images_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'images'
  and public.rbac_can_write_operational()
);

create policy rbac_storage_images_update on storage.objects
for update to authenticated
using (
  bucket_id = 'images'
  and public.rbac_can_write_operational()
)
with check (
  bucket_id = 'images'
  and public.rbac_can_write_operational()
);

create policy rbac_storage_images_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'images'
  and public.rbac_can_write_operational()
);

-- ---------------------------------------------------------------------------
-- 4. Policy unificate — bucket documenti (4 operazioni)
-- ---------------------------------------------------------------------------
create policy rbac_storage_documenti_select on storage.objects
for select to authenticated
using (
  bucket_id = 'documenti'
  and public.rbac_can_read_operational()
);

create policy rbac_storage_documenti_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documenti'
  and public.rbac_can_write_operational()
);

create policy rbac_storage_documenti_update on storage.objects
for update to authenticated
using (
  bucket_id = 'documenti'
  and public.rbac_can_write_operational()
)
with check (
  bucket_id = 'documenti'
  and public.rbac_can_write_operational()
);

create policy rbac_storage_documenti_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'documenti'
  and public.rbac_can_write_operational()
);

-- ---------------------------------------------------------------------------
-- 5. Verifica: solo policy rbac_storage_* su storage.objects, nessun foldername
-- ---------------------------------------------------------------------------
do $$
declare
  v_legacy int;
  v_total int;
  v_bad int;
begin
  select count(*) into v_legacy
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname not like 'rbac\_storage\_%' escape '\';

  if v_legacy > 0 then
    raise exception 'Policy storage legacy residue: %', v_legacy;
  end if;

  select count(*) into v_total
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects';

  if v_total <> 8 then
    raise exception 'Attese 8 policy storage (4 per bucket), trovate %', v_total;
  end if;

  select count(*) into v_bad
  from pg_policies p
  where p.schemaname = 'storage'
    and p.tablename = 'objects'
    and (
      coalesce(p.qual, '') ilike '%foldername%'
      or coalesce(p.qual, '') ilike '%split_part%'
      or coalesce(p.with_check, '') ilike '%foldername%'
      or coalesce(p.with_check, '') ilike '%split_part%'
    );

  if v_bad > 0 then
    raise exception 'Policy storage con parsing path: %', v_bad;
  end if;

  raise notice 'Storage refactor OK: 8 policy RBAC unificate (images + documenti).';
end $$;
