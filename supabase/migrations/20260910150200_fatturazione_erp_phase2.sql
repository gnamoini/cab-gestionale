-- ERP Fatturazione Hub — Fase 2: SDI snapshots + submissions + PA metadata.
begin;

create table if not exists public.invoice_fatturapa_snapshots (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  fatturapa_schema_version text not null default '3.0',
  xml_hash text not null,
  payload_json jsonb not null default '{}'::jsonb,
  generated_xml_path text,
  created_at timestamptz not null default now(),
  constraint invoice_fatturapa_snapshots_uq unique (invoice_id, fatturapa_schema_version, xml_hash)
);

create table if not exists public.invoice_sdi_submissions (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.invoice_fatturapa_snapshots (id) on delete cascade,
  idempotency_key text not null,
  provider text not null default 'stub',
  stato text not null default 'pending',
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  constraint invoice_sdi_submissions_idempotency_uq unique (idempotency_key)
);

create table if not exists public.invoice_public_administration_meta (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null unique references public.invoices (id) on delete cascade,
  cig text,
  cup text,
  order_reference text,
  pa_office_code text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_invoice_pa_meta_updated_at on public.invoice_public_administration_meta;
create trigger trg_invoice_pa_meta_updated_at
before update on public.invoice_public_administration_meta
for each row execute function public.set_updated_at();

alter table public.invoice_fatturapa_snapshots enable row level security;
alter table public.invoice_sdi_submissions enable row level security;
alter table public.invoice_public_administration_meta enable row level security;

drop policy if exists cap_invoice_fatturapa_snapshots on public.invoice_fatturapa_snapshots;
create policy cap_invoice_fatturapa_snapshots on public.invoice_fatturapa_snapshots for all to authenticated
using (public.rbac_module_can('fatturazione', 'read'))
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoice_sdi_submissions on public.invoice_sdi_submissions;
create policy cap_invoice_sdi_submissions on public.invoice_sdi_submissions for all to authenticated
using (public.rbac_module_can('fatturazione', 'read'))
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoice_pa_meta on public.invoice_public_administration_meta;
create policy cap_invoice_pa_meta on public.invoice_public_administration_meta for all to authenticated
using (public.rbac_module_can('fatturazione', 'read'))
with check (public.rbac_module_can('fatturazione', 'write'));

commit;
