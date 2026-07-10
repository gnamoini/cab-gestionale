-- Diario operativo condiviso (Dashboard): appunti giornalieri su eventi interni (guasti, infortuni, ecc.).

create table if not exists public.operational_diary_entries (
  id uuid primary key default gen_random_uuid(),
  work_date date not null,
  body text not null,
  created_by uuid not null references public.profiles (id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint operational_diary_body_len check (char_length(body) <= 2000),
  constraint operational_diary_body_nonempty check (char_length(trim(body)) > 0)
);

create unique index if not exists idx_operational_diary_active_day
  on public.operational_diary_entries (work_date)
  where deleted_at is null;

create index if not exists idx_operational_diary_work_date
  on public.operational_diary_entries (work_date desc)
  where deleted_at is null;

comment on table public.operational_diary_entries is
  'Diario operativo giornaliero condiviso; contesto qualitativo per dashboard e analisi AI report.';

drop trigger if exists trg_operational_diary_entries_updated_at on public.operational_diary_entries;
create trigger trg_operational_diary_entries_updated_at
before update on public.operational_diary_entries
for each row execute function public.set_updated_at();

alter table public.operational_diary_entries enable row level security;

drop policy if exists cap_operational_diary_select on public.operational_diary_entries;
create policy cap_operational_diary_select on public.operational_diary_entries for select to authenticated
using (
  deleted_at is null
  and public.rbac_has_capability(public.rbac_auth_uid(), 'can_read_operational')
);

drop policy if exists cap_operational_diary_insert on public.operational_diary_entries;
create policy cap_operational_diary_insert on public.operational_diary_entries for insert to authenticated
with check (
  public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational')
  and created_by = public.rbac_auth_uid()
);

drop policy if exists cap_operational_diary_update on public.operational_diary_entries;
create policy cap_operational_diary_update on public.operational_diary_entries for update to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational'))
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational'));

revoke all on table public.operational_diary_entries from public;
revoke all on table public.operational_diary_entries from anon;
grant select, insert, update on table public.operational_diary_entries to authenticated;
