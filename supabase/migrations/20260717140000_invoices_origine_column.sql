-- Metadati origine fattura per reporting e integrazioni future.

alter table public.invoices
  add column if not exists origine text,
  add column if not exists meta jsonb not null default '{}'::jsonb;

alter table public.invoices drop constraint if exists invoices_origine_chk;
alter table public.invoices add constraint invoices_origine_chk check (
  origine is null or origine in ('manuale', 'preventivo', 'multi_preventivo')
);

alter table public.invoices drop constraint if exists invoices_meta_obj_chk;
alter table public.invoices add constraint invoices_meta_obj_chk check (jsonb_typeof(meta) = 'object');

create index if not exists idx_invoices_origine on public.invoices (origine) where origine is not null;

comment on column public.invoices.origine is 'Origine documento: manuale, preventivo, multi_preventivo.';
comment on column public.invoices.meta is 'Estensioni future (FE, SDI, export).';
