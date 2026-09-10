-- FASE 5 — Document FKs + payables fornitore_id.
begin;

-- payables: supplier_ref → fornitore_id
alter table public.payables
  add column if not exists fornitore_id uuid references public.fornitori_anagrafiche (id) on delete set null;

update public.payables
set fornitore_id = supplier_ref
where fornitore_id is null and supplier_ref is not null
  and exists (select 1 from public.fornitori_anagrafiche f where f.id = supplier_ref);

-- Document FK columns (nullable — NOT NULL only per domain rules)
alter table public.mezzi
  add column if not exists cliente_id uuid references public.clienti_anagrafiche (id) on delete set null;

alter table public.preventivi
  add column if not exists cliente_id uuid references public.clienti_anagrafiche (id) on delete set null;

alter table public.ddt_documents
  add column if not exists cliente_id uuid references public.clienti_anagrafiche (id) on delete set null;

alter table public.ordini_fornitori
  add column if not exists fornitore_id uuid references public.fornitori_anagrafiche (id) on delete set null;

alter table public.inventory_documents
  add column if not exists fornitore_id uuid references public.fornitori_anagrafiche (id) on delete set null;

create index if not exists idx_mezzi_cliente_id on public.mezzi (cliente_id) where cliente_id is not null;
create index if not exists idx_preventivi_cliente_id on public.preventivi (cliente_id) where cliente_id is not null;
create index if not exists idx_ddt_documents_cliente_id on public.ddt_documents (cliente_id) where cliente_id is not null;
create index if not exists idx_ordini_fornitori_fornitore_id on public.ordini_fornitori (fornitore_id) where fornitore_id is not null;
create index if not exists idx_inventory_documents_fornitore_id on public.inventory_documents (fornitore_id) where fornitore_id is not null;
create index if not exists idx_payables_fornitore_id on public.payables (fornitore_id) where fornitore_id is not null;

comment on column public.mezzi.cliente is 'OPERATIONAL legacy text — use cliente_id for identity.';
comment on column public.preventivi.cliente is 'OPERATIONAL legacy text — use cliente_id for identity.';

commit;
