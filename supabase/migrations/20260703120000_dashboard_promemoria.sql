-- Calendario promemoria condiviso (Dashboard): eventi per giorno, notifica client-side alle 09:00.

create table if not exists public.dashboard_promemoria (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id) on delete restrict default auth.uid(),
  event_date date not null,
  title text not null,
  description text,
  deleted_at timestamptz,
  notified_on date,
  entity_type text,
  entity_id uuid,
  constraint dashboard_promemoria_title_nonempty check (char_length(trim(title)) > 0),
  constraint dashboard_promemoria_title_len check (char_length(trim(title)) <= 200)
);

create index if not exists idx_dashboard_promemoria_event_date
  on public.dashboard_promemoria (event_date)
  where deleted_at is null;

create index if not exists idx_dashboard_promemoria_created_at
  on public.dashboard_promemoria (created_at desc)
  where deleted_at is null;

comment on table public.dashboard_promemoria is
  'Promemoria operativi condivisi (Dashboard); data calendario senza orario; notifica giornaliera client.';

comment on column public.dashboard_promemoria.notified_on is
  'Ultima data per cui è stata emessa la notifica campanella (dedup per evento/giorno).';

drop trigger if exists trg_dashboard_promemoria_updated_at on public.dashboard_promemoria;
create trigger trg_dashboard_promemoria_updated_at
before update on public.dashboard_promemoria
for each row execute function public.set_updated_at();

alter table public.dashboard_promemoria enable row level security;

drop policy if exists cap_dashboard_promemoria_select on public.dashboard_promemoria;
create policy cap_dashboard_promemoria_select on public.dashboard_promemoria for select to authenticated
using (
  deleted_at is null
  and public.rbac_has_capability(public.rbac_auth_uid(), 'can_read_operational')
);

drop policy if exists cap_dashboard_promemoria_insert on public.dashboard_promemoria;
create policy cap_dashboard_promemoria_insert on public.dashboard_promemoria for insert to authenticated
with check (
  public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational')
  and created_by = public.rbac_auth_uid()
);

drop policy if exists cap_dashboard_promemoria_update on public.dashboard_promemoria;
create policy cap_dashboard_promemoria_update on public.dashboard_promemoria for update to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational'))
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational'));

revoke all on table public.dashboard_promemoria from public;
revoke all on table public.dashboard_promemoria from anon;
grant select, insert, update on table public.dashboard_promemoria to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.dashboard_promemoria;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
