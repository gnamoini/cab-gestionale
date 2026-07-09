-- ERP Fatturazione — opened_at / closed_at business dates su customer_open_items.
begin;

alter table public.customer_open_items
  add column if not exists opened_at timestamptz,
  add column if not exists closed_at timestamptz;

comment on column public.customer_open_items.opened_at is 'Data business apertura partita (distinta da created_at record).';
comment on column public.customer_open_items.closed_at is 'Data chiusura partita (remaining_signed = 0).';

update public.customer_open_items coi
set opened_at = coalesce(
  coi.opened_at,
  (select i.data_emissione::timestamptz from public.invoices i where i.id = coi.invoice_id),
  coi.created_at
)
where coi.opened_at is null;

update public.customer_open_items coi
set closed_at = coalesce(coi.closed_at, coi.updated_at)
where coi.status = 'closed' and coi.closed_at is null;

commit;
