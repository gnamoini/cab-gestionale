-- Impostazioni applicative condivise (liste, preferenze sistema) — centralizzate su DB
-- Idempotente

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint app_settings_module_key_len check (char_length(trim(module)) > 0 and char_length(trim(key)) > 0),
  constraint app_settings_value_object check (jsonb_typeof(value) = 'object'),
  constraint app_settings_module_key_unique unique (module, key)
);

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

create index if not exists idx_app_settings_module on public.app_settings (module);

comment on table public.app_settings is 'Configurazione globale gestionale (JSON per modulo/chiave); lettura autenticati, scrittura solo admin.';

alter table public.app_settings enable row level security;

drop policy if exists app_settings_select_auth on public.app_settings;
create policy app_settings_select_auth
on public.app_settings for select to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'sola_lettura', 'magazziniere', 'commerciale'));

drop policy if exists app_settings_insert_admin on public.app_settings;
create policy app_settings_insert_admin
on public.app_settings for insert to authenticated
with check (public.current_profile_role() = 'admin');

drop policy if exists app_settings_update_admin on public.app_settings;
create policy app_settings_update_admin
on public.app_settings for update to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists app_settings_delete_admin on public.app_settings;
create policy app_settings_delete_admin
on public.app_settings for delete to authenticated
using (public.current_profile_role() = 'admin');

-- Realtime (no-op se già presente o publication assente)
do $$
begin
  alter publication supabase_realtime add table public.app_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
