-- Branding globale: lettura pubblica impostazioni + storage logo in images/branding/

-- app_settings system.branding: lettura anon (login) e authenticated (tutti i ruoli)
drop policy if exists cap_app_settings_branding_public_select on public.app_settings;
create policy cap_app_settings_branding_public_select on public.app_settings
for select to anon
using (module = 'system' and key = 'branding');

drop policy if exists cap_app_settings_branding_auth_select on public.app_settings;
create policy cap_app_settings_branding_auth_select on public.app_settings
for select to authenticated
using (module = 'system' and key = 'branding');

-- Storage images/branding/*: logo pubblico in lettura
drop policy if exists cap_storage_branding_select on storage.objects;
create policy cap_storage_branding_select on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'images'
  and coalesce((storage.foldername(name))[1], '') = 'branding'
);

drop policy if exists cap_storage_branding_insert on storage.objects;
create policy cap_storage_branding_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'images'
  and coalesce((storage.foldername(name))[1], '') = 'branding'
  and public.rbac_has_capability(auth.uid(), 'can_manage_settings')
);

drop policy if exists cap_storage_branding_update on storage.objects;
create policy cap_storage_branding_update on storage.objects
for update to authenticated
using (
  bucket_id = 'images'
  and coalesce((storage.foldername(name))[1], '') = 'branding'
  and public.rbac_has_capability(auth.uid(), 'can_manage_settings')
)
with check (
  bucket_id = 'images'
  and coalesce((storage.foldername(name))[1], '') = 'branding'
  and public.rbac_has_capability(auth.uid(), 'can_manage_settings')
);

drop policy if exists cap_storage_branding_delete on storage.objects;
create policy cap_storage_branding_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'images'
  and coalesce((storage.foldername(name))[1], '') = 'branding'
  and public.rbac_has_capability(auth.uid(), 'can_manage_settings')
);

comment on table public.app_settings is 'Configurazione gestionale (JSON per modulo/chiave). Modulo system.branding: personalizzazione colore/logo globale.';
