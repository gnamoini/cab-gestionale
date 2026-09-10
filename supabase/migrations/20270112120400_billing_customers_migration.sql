-- FASE 5 — Migrate billing_customers → clienti_anagrafiche (NO DROP).
begin;

-- Step 1: Map via fiscal unique match (company-scoped)
insert into public.admin_billing_customer_migration_map (billing_customer_id, cliente_anagrafica_id, mapping_source)
select bc.id, ca.id, 'fiscal_unique'
from public.billing_customers bc
join public.clienti_anagrafiche ca
  on ca.company_id = '00000000-0000-4000-8000-000000000001'::uuid
 and bc.partita_iva is not null
 and trim(bc.partita_iva) <> ''
 and ca.partita_iva_normalized = public.admin_normalize_partita_iva(bc.partita_iva, 'IT')
where not exists (
  select 1 from public.admin_billing_customer_migration_map m where m.billing_customer_id = bc.id
)
and (
  select count(*)
  from public.clienti_anagrafiche ca2
  where ca2.company_id = ca.company_id
    and ca2.partita_iva_normalized = ca.partita_iva_normalized
) = 1;

-- CF unique match (where PIVA match didn't apply)
insert into public.admin_billing_customer_migration_map (billing_customer_id, cliente_anagrafica_id, mapping_source)
select bc.id, ca.id, 'fiscal_unique'
from public.billing_customers bc
join public.clienti_anagrafiche ca
  on ca.company_id = '00000000-0000-4000-8000-000000000001'::uuid
 and bc.codice_fiscale is not null
 and trim(bc.codice_fiscale) <> ''
 and ca.codice_fiscale_normalized = public.admin_normalize_codice_fiscale(bc.codice_fiscale, 'IT')
where not exists (
  select 1 from public.admin_billing_customer_migration_map m where m.billing_customer_id = bc.id
)
and (
  select count(*)
  from public.clienti_anagrafiche ca2
  where ca2.company_id = ca.company_id
    and ca2.codice_fiscale_normalized = ca.codice_fiscale_normalized
) = 1;

-- Detect fiscal conflicts (multiple cliente matches)
insert into public.admin_master_data_conflicts (
  company_id, entity_type, field_name, field_value, record_ids, status
)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  'billing_migration',
  'partita_iva',
  public.admin_normalize_partita_iva(bc.partita_iva, 'IT'),
  array_agg(ca.id),
  'review_required'
from public.billing_customers bc
join public.clienti_anagrafiche ca
  on ca.company_id = '00000000-0000-4000-8000-000000000001'::uuid
 and ca.partita_iva_normalized = public.admin_normalize_partita_iva(bc.partita_iva, 'IT')
where bc.partita_iva is not null and trim(bc.partita_iva) <> ''
  and not exists (select 1 from public.admin_billing_customer_migration_map m where m.billing_customer_id = bc.id)
group by bc.id, public.admin_normalize_partita_iva(bc.partita_iva, 'IT')
having count(*) > 1;

-- Step 2: Create new clienti_anagrafiche for unmapped billing_customers
insert into public.clienti_anagrafiche (
  company_id,
  nome_display,
  entity_key,
  ragione_sociale,
  partita_iva,
  codice_fiscale,
  pec,
  codice_destinatario,
  note,
  legacy_billing_customer_id,
  in_lista_settings
)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  bc.cliente_label,
  coalesce(bc.entity_key, 'billing:' || bc.id::text),
  bc.ragione_sociale,
  bc.partita_iva,
  bc.codice_fiscale,
  bc.pec,
  bc.codice_sdi,
  bc.note,
  bc.id,
  false
from public.billing_customers bc
where not exists (
  select 1 from public.admin_billing_customer_migration_map m where m.billing_customer_id = bc.id
)
and not exists (
  select 1 from public.admin_master_data_conflicts c
  where c.entity_type = 'billing_migration'
    and c.status = 'review_required'
    and bc.id = any(
      select unnest(array(select id from public.billing_customers where partita_iva = bc.partita_iva))
    )
);

insert into public.admin_billing_customer_migration_map (billing_customer_id, cliente_anagrafica_id, mapping_source)
select bc.id, ca.id, 'new_record'
from public.billing_customers bc
join public.clienti_anagrafiche ca on ca.legacy_billing_customer_id = bc.id
where not exists (
  select 1 from public.admin_billing_customer_migration_map m where m.billing_customer_id = bc.id
);

-- Merge billing_customer_profiles into clienti
update public.clienti_anagrafiche ca
set
  split_payment = coalesce(bcp.split_payment, ca.split_payment),
  natura_iva_default = coalesce(bcp.natura_iva_default, ca.natura_iva_default)
from public.admin_billing_customer_migration_map m
join public.billing_customer_profiles bcp on bcp.customer_id = m.billing_customer_id
where ca.id = m.cliente_anagrafica_id;

-- Enrich existing clienti from billing data where empty
update public.clienti_anagrafiche ca
set
  ragione_sociale = coalesce(ca.ragione_sociale, bc.ragione_sociale),
  codice_fiscale = coalesce(ca.codice_fiscale, bc.codice_fiscale),
  pec = coalesce(ca.pec, bc.pec),
  codice_destinatario = coalesce(ca.codice_destinatario, bc.codice_sdi),
  legacy_billing_customer_id = coalesce(ca.legacy_billing_customer_id, bc.id)
from public.admin_billing_customer_migration_map m
join public.billing_customers bc on bc.id = m.billing_customer_id
where ca.id = m.cliente_anagrafica_id;

-- Step 3: Repoint FKs (invoices, open items, payments, receivables)
alter table public.invoices drop constraint if exists invoices_customer_id_fkey;
alter table public.customer_open_items drop constraint if exists customer_open_items_customer_id_fkey;
alter table public.customer_payments drop constraint if exists customer_payments_customer_id_fkey;
alter table public.receivables drop constraint if exists receivables_customer_id_fkey;

update public.invoices i
set customer_id = m.cliente_anagrafica_id
from public.admin_billing_customer_migration_map m
where i.customer_id = m.billing_customer_id;

update public.customer_open_items o
set customer_id = m.cliente_anagrafica_id
from public.admin_billing_customer_migration_map m
where o.customer_id = m.billing_customer_id;

update public.customer_payments p
set customer_id = m.cliente_anagrafica_id
from public.admin_billing_customer_migration_map m
where p.customer_id = m.billing_customer_id;

update public.receivables r
set customer_id = m.cliente_anagrafica_id
from public.admin_billing_customer_migration_map m
where r.customer_id = m.billing_customer_id;

alter table public.invoices
  add constraint invoices_customer_id_fkey
  foreign key (customer_id) references public.clienti_anagrafiche (id) on delete set null;

alter table public.customer_open_items
  add constraint customer_open_items_customer_id_fkey
  foreign key (customer_id) references public.clienti_anagrafiche (id) on delete set null;

alter table public.customer_payments
  add constraint customer_payments_customer_id_fkey
  foreign key (customer_id) references public.clienti_anagrafiche (id) on delete set null;

alter table public.receivables
  add constraint receivables_customer_id_fkey
  foreign key (customer_id) references public.clienti_anagrafiche (id) on delete set null;

-- billing_customers remains read-only legacy until A8
comment on table public.billing_customers is 'LEGACY — read-only post A5. Remove after gate A8.';

commit;
