-- Magazzino stock integrity: idempotency, RBAC expansion, master settings RLS

-- R-22: idempotent movements
alter table public.movimenti_ricambi
  add column if not exists operation_id uuid,
  add column if not exists meta jsonb not null default '{}'::jsonb;

create unique index if not exists idx_movimenti_ricambi_operation_id
  on public.movimenti_ricambi (operation_id)
  where operation_id is not null;

-- R-04: align page expansion magazzino → magazzino_carichi (app expandableModules)
insert into public.rbac_page_module_expansion (page_key, module)
values ('magazzino', 'magazzino_carichi')
on conflict (page_key, module) do nothing;

-- R-01: magazzino write can upsert master + stock_policy without impostazioni
drop policy if exists cap_app_settings_magazzino_master_insert on public.app_settings;
create policy cap_app_settings_magazzino_master_insert on public.app_settings
for insert to authenticated
with check (
  module = 'magazzino'
  and key in ('master', 'stock_policy')
  and public.rbac_module_can('magazzino', 'write')
);

drop policy if exists cap_app_settings_magazzino_master_update on public.app_settings;
create policy cap_app_settings_magazzino_master_update on public.app_settings
for update to authenticated
using (
  module = 'magazzino'
  and key in ('master', 'stock_policy')
  and public.rbac_module_can('magazzino', 'write')
)
with check (
  module = 'magazzino'
  and key in ('master', 'stock_policy')
  and public.rbac_module_can('magazzino', 'write')
);

drop policy if exists cap_app_settings_magazzino_master_delete on public.app_settings;
create policy cap_app_settings_magazzino_master_delete on public.app_settings
for delete to authenticated
using (
  module = 'magazzino'
  and key in ('master', 'stock_policy')
  and public.rbac_module_can('magazzino', 'write')
);
