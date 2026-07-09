-- ERP Fatturazione — reconciliation reports, legacy audit, backfill snapshot.
begin;

create or replace function public.invoice_legacy_status_audit_report()
returns table (
  invoice_id uuid,
  status text,
  derived text,
  mismatch boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id as invoice_id,
    i.status,
    public.invoice_derive_legacy_status(
      i.document_status,
      i.payment_status,
      i.sent_to_customer_at,
      i.data_scadenza
    ) as derived,
    i.status is distinct from public.invoice_derive_legacy_status(
      i.document_status,
      i.payment_status,
      i.sent_to_customer_at,
      i.data_scadenza
    ) as mismatch
  from public.invoices i
  where i.status is distinct from public.invoice_derive_legacy_status(
    i.document_status,
    i.payment_status,
    i.sent_to_customer_at,
    i.data_scadenza
  );
$$;

create or replace function public.invoice_status_backfill_snapshot()
returns table (
  totale_fatture bigint,
  bozze bigint,
  pagate bigint,
  scadute bigint,
  annullate bigint,
  emesse bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint as totale_fatture,
    count(*) filter (where coalesce(document_status, status) in ('bozza', 'da_verificare'))::bigint as bozze,
    count(*) filter (where coalesce(payment_status, '') = 'pagata' or status = 'pagata')::bigint as pagate,
    count(*) filter (where coalesce(payment_status, '') = 'scaduta' or status = 'scaduta')::bigint as scadute,
    count(*) filter (where coalesce(document_status, status) = 'annullata' or status = 'annullata')::bigint as annullate,
    count(*) filter (where coalesce(document_status, status) = 'emessa' or status in ('emessa', 'inviata', 'parzialmente_pagata', 'pagata', 'scaduta'))::bigint as emesse
  from public.invoices;
$$;

create or replace function public.invoice_payment_reconciliation_report()
returns table (
  invoice_id uuid,
  totale numeric,
  pagato numeric,
  residuo numeric,
  open_item_remaining numeric,
  allocations_sum numeric,
  mismatch boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id as invoice_id,
    i.totale,
    i.pagato,
    i.residuo,
    coi.remaining_signed as open_item_remaining,
    coalesce(alloc.s, 0) as allocations_sum,
    (
      abs(i.totale - (i.pagato + i.residuo)) > 0.02
      or (coi.id is not null and abs(abs(coi.remaining_signed) - i.residuo) > 0.02)
      or (coi.id is not null and coalesce(alloc.s, 0) > 0 and abs(coalesce(alloc.s, 0) - i.pagato) > 0.02)
    ) as mismatch
  from public.invoices i
  left join public.customer_open_items coi on coi.invoice_id = i.id and coi.source_type = 'invoice'
  left join lateral (
    select sum(pa.amount) as s
    from public.payment_allocations pa
    join public.customer_payments cp on cp.id = pa.payment_id
    join public.customer_open_items oi on oi.id = pa.open_item_id
    where oi.invoice_id = i.id
  ) alloc on true
  where coalesce(i.document_status, i.status) = 'emessa'
    and i.status <> 'annullata';
$$;

create or replace function public.customer_balance_reconciliation_report()
returns table (
  customer_id uuid,
  open_items_sum numeric,
  invoice_debits numeric,
  credit_notes numeric,
  advances numeric,
  accounting_balance numeric,
  mismatch boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coi.customer_id,
    sum(coi.remaining_signed) as open_items_sum,
    sum(coi.remaining_signed) filter (where coi.source_type = 'invoice') as invoice_debits,
    sum(coi.remaining_signed) filter (where coi.source_type = 'credit_note') as credit_notes,
    sum(coi.remaining_signed) filter (where coi.source_type = 'customer_advance') as advances,
    coalesce(sum(coi.remaining_signed) filter (where coi.source_type = 'invoice'), 0)
      + coalesce(sum(coi.remaining_signed) filter (where coi.source_type = 'credit_note'), 0)
      + coalesce(sum(coi.remaining_signed) filter (where coi.source_type = 'customer_advance'), 0) as accounting_balance,
    false as mismatch
  from public.customer_open_items coi
  where coi.customer_id is not null
    and coi.status <> 'closed'
  group by coi.customer_id;
$$;

grant execute on function public.invoice_legacy_status_audit_report() to authenticated;
grant execute on function public.invoice_status_backfill_snapshot() to authenticated;
grant execute on function public.invoice_payment_reconciliation_report() to authenticated;
grant execute on function public.customer_balance_reconciliation_report() to authenticated;

commit;
