-- Bucket cache PDF artifact (lavorazioni-in-corso, report, schede, …).
-- Senza bucket: uploadPdfArtifactBestEffort logga "Bucket not found" e rigenera ogni volta.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pdf-artifacts',
  'pdf-artifacts',
  false,
  15 * 1024 * 1024,
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists rbac_storage_pdf_artifacts_select on storage.objects;
create policy rbac_storage_pdf_artifacts_select on storage.objects
for select to authenticated
using (
  bucket_id = 'pdf-artifacts'
  and public.rbac_can_read_operational()
);

drop policy if exists rbac_storage_pdf_artifacts_insert on storage.objects;
create policy rbac_storage_pdf_artifacts_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'pdf-artifacts'
  and public.rbac_can_write_operational()
);

drop policy if exists rbac_storage_pdf_artifacts_update on storage.objects;
create policy rbac_storage_pdf_artifacts_update on storage.objects
for update to authenticated
using (
  bucket_id = 'pdf-artifacts'
  and public.rbac_can_write_operational()
)
with check (
  bucket_id = 'pdf-artifacts'
  and public.rbac_can_write_operational()
);

drop policy if exists rbac_storage_pdf_artifacts_delete on storage.objects;
create policy rbac_storage_pdf_artifacts_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'pdf-artifacts'
  and public.rbac_can_write_operational()
);

notify pgrst, 'reload schema';
