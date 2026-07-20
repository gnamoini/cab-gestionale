-- Operational Intelligence Platform: periodi e storico brief

create table if not exists public.operational_periods (
  id text primary key,
  period_type text not null check (period_type in ('weekly', 'monthly', 'custom')),
  start_date date not null,
  end_date date not null,
  previous_period_id text references public.operational_periods (id) on delete set null,
  label text not null,
  status text not null default 'open' check (status in ('open', 'closed', 'brief_generated')),
  generated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.operational_briefs (
  id uuid primary key default gen_random_uuid(),
  period_id text not null references public.operational_periods (id) on delete cascade,
  brief_json jsonb not null,
  input_hash text not null,
  model text,
  prompt_version text,
  generated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null default auth.uid()
);

create index if not exists idx_operational_briefs_period on public.operational_briefs (period_id, generated_at desc);

-- P2: classificazione diario operativo
alter table public.operational_diary_entries
  add column if not exists category text check (category in ('issue', 'customer', 'machine', 'supplier', 'staff', 'improvement', 'warning')),
  add column if not exists severity text check (severity in ('low', 'medium', 'high')),
  add column if not exists related_entity_type text,
  add column if not exists related_entity_id text;

comment on table public.operational_periods is 'Periodi operativi (settimana/mese) per brief e confronto storico.';
comment on table public.operational_briefs is 'Storico brief operativi generati (OIP).';

alter table public.operational_periods enable row level security;
alter table public.operational_briefs enable row level security;

drop policy if exists cap_operational_periods_select on public.operational_periods;
create policy cap_operational_periods_select on public.operational_periods for select to authenticated
using (public.rbac_user_page_access_level(public.rbac_auth_uid(), 'report') in ('read', 'write'));

drop policy if exists cap_operational_periods_insert on public.operational_periods;
create policy cap_operational_periods_insert on public.operational_periods for insert to authenticated
with check (public.rbac_user_page_access_level(public.rbac_auth_uid(), 'report') = 'write');

drop policy if exists cap_operational_briefs_select on public.operational_briefs;
create policy cap_operational_briefs_select on public.operational_briefs for select to authenticated
using (public.rbac_user_page_access_level(public.rbac_auth_uid(), 'report') in ('read', 'write'));

drop policy if exists cap_operational_briefs_insert on public.operational_briefs;
create policy cap_operational_briefs_insert on public.operational_briefs for insert to authenticated
with check (public.rbac_user_page_access_level(public.rbac_auth_uid(), 'report') in ('read', 'write'));

grant select, insert on public.operational_periods to authenticated;
grant select, insert on public.operational_briefs to authenticated;

notify pgrst, 'reload schema';
