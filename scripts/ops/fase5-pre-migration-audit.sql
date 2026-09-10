-- FASE 5 — Pre-migration audit (READ-ONLY)
-- Eseguire prima di A5/A6. Non modifica dati.

-- Duplicati P.IVA in billing_customers (normalizzata)
select 'billing_customers_piva_dup' as report,
       admin_normalize_partita_iva(partita_iva, 'IT') as piva_norm,
       count(*) as cnt,
       array_agg(id) as record_ids
from public.billing_customers
where partita_iva is not null and trim(partita_iva) <> ''
group by admin_normalize_partita_iva(partita_iva, 'IT')
having count(*) > 1;

-- Duplicati CF in billing_customers
select 'billing_customers_cf_dup' as report,
       admin_normalize_codice_fiscale(codice_fiscale, 'IT') as cf_norm,
       count(*) as cnt,
       array_agg(id) as record_ids
from public.billing_customers
where codice_fiscale is not null and trim(codice_fiscale) <> ''
group by admin_normalize_codice_fiscale(codice_fiscale, 'IT')
having count(*) > 1;

-- Duplicati P.IVA in clienti_anagrafiche
select 'clienti_anagrafiche_piva_dup' as report,
       admin_normalize_partita_iva(partita_iva, coalesce(nazione, 'IT')) as piva_norm,
       company_id,
       count(*) as cnt,
       array_agg(id) as record_ids
from public.clienti_anagrafiche
where partita_iva is not null and trim(partita_iva) <> ''
group by admin_normalize_partita_iva(partita_iva, coalesce(nazione, 'IT')), company_id
having count(*) > 1;

-- Orfani billing_customers (nessun invoice/open_item/payment/receivable)
select 'billing_orphans' as report, bc.id, bc.cliente_label
from public.billing_customers bc
where not exists (select 1 from public.invoices i where i.customer_id = bc.id)
  and not exists (select 1 from public.customer_open_items o where o.customer_id = bc.id)
  and not exists (select 1 from public.customer_payments p where p.customer_id = bc.id)
  and not exists (select 1 from public.receivables r where r.customer_id = bc.id);

-- Proposte mapping (NON applicate) — solo informativo
select 'mapping_proposal_fiscal' as report,
       bc.id as billing_id,
       ca.id as proposed_cliente_id,
       'fiscal_unique' as proposal_source
from public.billing_customers bc
join public.clienti_anagrafiche ca
  on ca.company_id = '00000000-0000-4000-8000-000000000001'::uuid
 and admin_normalize_partita_iva(ca.partita_iva, coalesce(ca.nazione, 'IT'))
   = admin_normalize_partita_iva(bc.partita_iva, 'IT')
where bc.partita_iva is not null and trim(bc.partita_iva) <> '';
