-- Storico modifiche `app_settings` (solo UPDATE riusciti → nessuna riga audit su OCC 0-row).
-- Inserimento audit in trigger AFTER UPDATE (stesso commit, operazione leggera).

create table if not exists public.app_settings_audit (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  key text not null,
  old_value jsonb not null default '{}'::jsonb,
  new_value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null,
  constraint app_settings_audit_value_object_old check (jsonb_typeof(old_value) = 'object'),
  constraint app_settings_audit_value_object_new check (jsonb_typeof(new_value) = 'object')
);

create index if not exists idx_app_settings_audit_module_key_at
  on public.app_settings_audit (module, key, updated_at desc);

create index if not exists idx_app_settings_audit_updated_at
  on public.app_settings_audit (updated_at desc);

comment on table public.app_settings_audit is 'Storico UPDATE su app_settings; scrittura solo da trigger DB. Lettura RLS solo admin.';

alter table public.app_settings_audit enable row level security;

drop policy if exists app_settings_audit_select_admin on public.app_settings_audit;
create policy app_settings_audit_select_admin
on public.app_settings_audit for select to authenticated
using (public.current_profile_role() = 'admin');

-- Nessuna policy INSERT/UPDATE/DELETE per authenticated: scrittura solo come owner/supabase da trigger.

revoke all on table public.app_settings_audit from public;
revoke all on table public.app_settings_audit from anon;
grant select on table public.app_settings_audit to authenticated;

create or replace function public.log_app_settings_update_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_settings_audit (module, key, old_value, new_value, updated_by, updated_at)
  values (
    old.module,
    old.key,
    old.value,
    new.value,
    new.updated_by,
    new.updated_at
  );
  return new;
end;
$$;

revoke all on function public.log_app_settings_update_audit() from public;

drop trigger if exists trg_app_settings_audit_update on public.app_settings;
create trigger trg_app_settings_audit_update
after update on public.app_settings
for each row execute function public.log_app_settings_update_audit();
