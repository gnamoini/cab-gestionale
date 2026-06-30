-- Modulo Fatturazione ERP-ready.
-- Aggiunge modello dati, RLS e RPC transazionali senza migrare i clienti legacy.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  cliente_label text not null,
  entity_key text,
  ragione_sociale text,
  partita_iva text,
  codice_fiscale text,
  pec text,
  codice_sdi text,
  indirizzo jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_customers_cliente_label_chk check (char_length(trim(cliente_label)) > 0),
  constraint billing_customers_indirizzo_obj_chk check (jsonb_typeof(indirizzo) = 'object')
);

drop trigger if exists trg_billing_customers_updated_at on public.billing_customers;
create trigger trg_billing_customers_updated_at
before update on public.billing_customers
for each row execute function public.set_updated_at();

create unique index if not exists idx_billing_customers_entity_key_uq
  on public.billing_customers (entity_key)
  where entity_key is not null and entity_key <> '';
create index if not exists idx_billing_customers_cliente_label_trgm
  on public.billing_customers using gin (cliente_label gin_trgm_ops);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  numero integer not null,
  anno integer not null,
  status text not null default 'bozza',
  customer_id uuid references public.billing_customers (id) on delete set null,
  cliente_label text not null,
  customer_snapshot jsonb not null default '{}'::jsonb,
  data_emissione date not null default current_date,
  data_scadenza date,
  imponibile numeric(14, 2) not null default 0,
  iva numeric(14, 2) not null default 0,
  totale numeric(14, 2) not null default 0,
  pagato numeric(14, 2) not null default 0,
  residuo numeric(14, 2) not null default 0,
  note text,
  admin_notes text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  annullata_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_status_chk check (
    status in ('bozza', 'da_verificare', 'emessa', 'inviata', 'parzialmente_pagata', 'pagata', 'scaduta', 'annullata')
  ),
  constraint invoices_cliente_label_chk check (char_length(trim(cliente_label)) > 0),
  constraint invoices_anno_chk check (anno between 2000 and 2100),
  constraint invoices_numero_chk check (numero > 0),
  constraint invoices_amounts_chk check (imponibile >= 0 and iva >= 0 and totale >= 0 and pagato >= 0 and residuo >= 0),
  constraint invoices_snapshot_obj_chk check (jsonb_typeof(customer_snapshot) = 'object')
);

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create unique index if not exists idx_invoices_anno_numero_uq on public.invoices (anno, numero);
create index if not exists idx_invoices_status on public.invoices (status);
create index if not exists idx_invoices_data_emissione_desc on public.invoices (data_emissione desc);
create index if not exists idx_invoices_data_scadenza on public.invoices (data_scadenza);
create index if not exists idx_invoices_cliente_label_trgm on public.invoices using gin (cliente_label gin_trgm_ops);
create index if not exists idx_invoices_customer_id on public.invoices (customer_id);

create table if not exists public.invoice_rows (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  tipo text not null,
  descrizione text not null,
  quantita numeric(14, 3) not null default 1,
  prezzo_unitario numeric(14, 4) not null default 0,
  sconto_percent numeric(6, 3) not null default 0,
  iva_percent numeric(6, 3) not null default 22,
  imponibile numeric(14, 2) not null default 0,
  iva numeric(14, 2) not null default 0,
  totale numeric(14, 2) not null default 0,
  ricambio_id uuid references public.magazzino_ricambi (id) on delete set null,
  lavorazione_id uuid references public.lavorazioni (id) on delete set null,
  preventivo_id uuid references public.preventivi (id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint invoice_rows_tipo_chk check (
    tipo in ('ricambio', 'articolo_magazzino', 'manodopera', 'lavorazione', 'costo_extra', 'libera')
  ),
  constraint invoice_rows_descrizione_chk check (char_length(trim(descrizione)) > 0),
  constraint invoice_rows_amounts_chk check (
    quantita > 0 and prezzo_unitario >= 0 and sconto_percent between 0 and 100 and iva_percent >= 0
    and imponibile >= 0 and iva >= 0 and totale >= 0
  ),
  constraint invoice_rows_meta_obj_chk check (jsonb_typeof(meta) = 'object')
);

create index if not exists idx_invoice_rows_invoice_id on public.invoice_rows (invoice_id);
create index if not exists idx_invoice_rows_preventivo_id on public.invoice_rows (preventivo_id);
create index if not exists idx_invoice_rows_lavorazione_id on public.invoice_rows (lavorazione_id);

create table if not exists public.invoice_links (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  allocated_imponibile numeric(14, 2) not null default 0,
  allocated_iva numeric(14, 2) not null default 0,
  allocated_totale numeric(14, 2) not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint invoice_links_source_type_chk check (
    source_type in ('preventivo', 'lavorazione', 'mezzo', 'attrezzatura', 'ricambio')
  ),
  constraint invoice_links_allocations_chk check (
    allocated_imponibile >= 0 and allocated_iva >= 0 and allocated_totale >= 0
  ),
  constraint invoice_links_meta_obj_chk check (jsonb_typeof(meta) = 'object')
);

create index if not exists idx_invoice_links_source on public.invoice_links (source_type, source_id);
create index if not exists idx_invoice_links_invoice_id on public.invoice_links (invoice_id);

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  data date not null default current_date,
  importo numeric(14, 2) not null,
  metodo text not null,
  riferimento text,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint invoice_payments_importo_chk check (importo > 0),
  constraint invoice_payments_metodo_chk check (metodo in ('bonifico', 'contanti', 'assegno', 'pos', 'altro'))
);

create index if not exists idx_invoice_payments_invoice_data on public.invoice_payments (invoice_id, data desc);

alter table public.billing_customers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_rows enable row level security;
alter table public.invoice_links enable row level security;
alter table public.invoice_payments enable row level security;

create or replace function public.rbac_resource_to_module(p_resource text)
returns text
language sql
immutable
as $$
  select case coalesce(p_resource, '')
    when 'mezzi' then 'mezzi'
    when 'lavorazioni' then 'lavorazioni'
    when 'scheda_lavorazione' then 'lavorazioni'
    when 'magazzino' then 'magazzino'
    when 'magazzino_ricambi' then 'magazzino'
    when 'movimenti_ricambi' then 'magazzino'
    when 'documenti' then 'documenti'
    when 'preventivi' then 'preventivi'
    when 'report' then 'report'
    when 'billing_customers' then 'fatturazione'
    when 'invoices' then 'fatturazione'
    when 'invoice_rows' then 'fatturazione'
    when 'invoice_links' then 'fatturazione'
    when 'invoice_payments' then 'fatturazione'
    else null
  end;
$$;

create or replace function public.rbac_log_entita_module(p_entita text)
returns text
language sql
immutable
as $$
  select case coalesce(p_entita, '')
    when 'mezzi' then 'mezzi'
    when 'lavorazioni' then 'lavorazioni'
    when 'magazzino' then 'magazzino'
    when 'magazzino_ricambi' then 'magazzino'
    when 'preventivi' then 'preventivi'
    when 'documenti' then 'documenti'
    when 'billing_customers' then 'fatturazione'
    when 'invoices' then 'fatturazione'
    when 'invoice_payments' then 'fatturazione'
    else null
  end;
$$;

create or replace function public.rbac_staff_has_any_module_read()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_effective_can('magazzino', 'read')
    or public.user_effective_can('preventivi', 'read')
    or public.user_effective_can('lavorazioni', 'read')
    or public.user_effective_can('mezzi', 'read')
    or public.user_effective_can('report', 'read')
    or public.user_effective_can('documenti', 'read')
    or public.user_effective_can('dipendenti', 'read')
    or public.user_effective_can('fatturazione', 'read');
$$;

drop policy if exists cap_billing_customers_select on public.billing_customers;
create policy cap_billing_customers_select on public.billing_customers for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_billing_customers_insert on public.billing_customers;
create policy cap_billing_customers_insert on public.billing_customers for insert to authenticated
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_billing_customers_update on public.billing_customers;
create policy cap_billing_customers_update on public.billing_customers for update to authenticated
using (public.rbac_module_can('fatturazione', 'write'))
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoices_select on public.invoices;
create policy cap_invoices_select on public.invoices for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_invoices_insert on public.invoices;
create policy cap_invoices_insert on public.invoices for insert to authenticated
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoices_update on public.invoices;
create policy cap_invoices_update on public.invoices for update to authenticated
using (public.rbac_module_can('fatturazione', 'write'))
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoices_delete on public.invoices;
create policy cap_invoices_delete on public.invoices for delete to authenticated
using (public.rbac_module_can('fatturazione', 'admin') and status = 'bozza');

drop policy if exists cap_invoice_rows_select on public.invoice_rows;
create policy cap_invoice_rows_select on public.invoice_rows for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_invoice_rows_insert on public.invoice_rows;
create policy cap_invoice_rows_insert on public.invoice_rows for insert to authenticated
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoice_rows_update on public.invoice_rows;
create policy cap_invoice_rows_update on public.invoice_rows for update to authenticated
using (public.rbac_module_can('fatturazione', 'write'))
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoice_rows_delete on public.invoice_rows;
create policy cap_invoice_rows_delete on public.invoice_rows for delete to authenticated
using (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoice_links_select on public.invoice_links;
create policy cap_invoice_links_select on public.invoice_links for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_invoice_links_insert on public.invoice_links;
create policy cap_invoice_links_insert on public.invoice_links for insert to authenticated
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoice_links_update on public.invoice_links;
create policy cap_invoice_links_update on public.invoice_links for update to authenticated
using (public.rbac_module_can('fatturazione', 'write'))
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoice_links_delete on public.invoice_links;
create policy cap_invoice_links_delete on public.invoice_links for delete to authenticated
using (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoice_payments_select on public.invoice_payments;
create policy cap_invoice_payments_select on public.invoice_payments for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_invoice_payments_insert on public.invoice_payments;
create policy cap_invoice_payments_insert on public.invoice_payments for insert to authenticated
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoice_payments_update on public.invoice_payments;
create policy cap_invoice_payments_update on public.invoice_payments for update to authenticated
using (public.rbac_module_can('fatturazione', 'write'))
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoice_payments_delete on public.invoice_payments;
create policy cap_invoice_payments_delete on public.invoice_payments for delete to authenticated
using (public.rbac_module_can('fatturazione', 'admin'));

create or replace function public.invoice_recalculate_status(
  p_total numeric,
  p_paid numeric,
  p_due_date date,
  p_current_status text
)
returns text
language plpgsql
stable
as $$
declare
  v_residuo numeric;
begin
  if p_current_status = 'annullata' then
    return 'annullata';
  end if;
  if p_current_status in ('bozza', 'da_verificare') then
    return p_current_status;
  end if;

  v_residuo := greatest(round(coalesce(p_total, 0) - coalesce(p_paid, 0), 2), 0);
  if v_residuo = 0 and coalesce(p_total, 0) > 0 then
    return 'pagata';
  end if;
  if coalesce(p_paid, 0) > 0 then
    return 'parzialmente_pagata';
  end if;
  if p_due_date is not null and p_due_date < current_date then
    return 'scaduta';
  end if;
  return p_current_status;
end;
$$;

create or replace function public.invoice_preventivo_allocated_total(p_preventivo_id uuid, p_exclude_invoice_id uuid default null)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(il.allocated_totale), 0)::numeric
  from public.invoice_links il
  join public.invoices i on i.id = il.invoice_id
  where il.source_type = 'preventivo'
    and il.source_id = p_preventivo_id
    and i.status <> 'annullata'
    and (p_exclude_invoice_id is null or i.id <> p_exclude_invoice_id);
$$;

create or replace function public.assert_invoice_preventivo_allocations(p_invoice_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r record;
  v_totale numeric;
  v_allocated numeric;
begin
  for r in
    select source_id, sum(allocated_totale)::numeric as allocated_totale
    from public.invoice_links
    where invoice_id = p_invoice_id and source_type = 'preventivo'
    group by source_id
  loop
    select p.totale into v_totale from public.preventivi p where p.id = r.source_id;
    if v_totale is null then
      raise exception 'Preventivo collegato non trovato';
    end if;
    v_allocated := public.invoice_preventivo_allocated_total(r.source_id, p_invoice_id) + r.allocated_totale;
    if round(v_allocated, 2) > round(v_totale, 2) then
      raise exception 'Importo fatturato superiore al residuo del preventivo';
    end if;
  end loop;
end;
$$;

create or replace function public.create_invoice_with_rows_and_links(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_invoice_id uuid;
  v_year integer;
  v_numero integer;
  v_status text;
  v_customer_id uuid;
  v_cliente_label text;
  v_customer_snapshot jsonb;
  v_data_emissione date;
  v_data_scadenza date;
  v_note text;
  v_admin_notes text;
  v_imponibile numeric := 0;
  v_iva numeric := 0;
  v_totale numeric := 0;
  v_row jsonb;
  v_row_imponibile numeric;
  v_row_iva numeric;
  v_row_totale numeric;
  v_link jsonb;
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  v_cliente_label := nullif(trim(p_payload->>'cliente_label'), '');
  if v_cliente_label is null then
    raise exception 'Cliente fattura obbligatorio';
  end if;

  v_status := coalesce(nullif(p_payload->>'status', ''), 'bozza');
  if v_status not in ('bozza', 'da_verificare', 'emessa', 'inviata') then
    raise exception 'Stato fattura iniziale non valido';
  end if;

  v_data_emissione := coalesce(nullif(p_payload->>'data_emissione', '')::date, current_date);
  v_data_scadenza := nullif(p_payload->>'data_scadenza', '')::date;
  v_year := coalesce((p_payload->>'anno')::integer, extract(year from v_data_emissione)::integer);
  v_customer_id := nullif(p_payload->>'customer_id', '')::uuid;
  v_customer_snapshot := coalesce(p_payload->'customer_snapshot', '{}'::jsonb);
  v_note := nullif(p_payload->>'note', '');
  v_admin_notes := nullif(p_payload->>'admin_notes', '');

  perform pg_advisory_xact_lock(hashtext('invoices:' || v_year::text));

  select coalesce(max(numero), 0) + 1 into v_numero
  from public.invoices
  where anno = v_year;

  insert into public.invoices (
    numero, anno, status, customer_id, cliente_label, customer_snapshot,
    data_emissione, data_scadenza, note, admin_notes, created_by, updated_by
  )
  values (
    v_numero, v_year, v_status, v_customer_id, v_cliente_label, v_customer_snapshot,
    v_data_emissione, v_data_scadenza, v_note, v_admin_notes, v_uid, v_uid
  )
  returning id into v_invoice_id;

  for v_row in select * from jsonb_array_elements(coalesce(p_payload->'rows', '[]'::jsonb))
  loop
    v_row_imponibile := round(
      greatest(coalesce((v_row->>'quantita')::numeric, 1), 0)
      * greatest(coalesce((v_row->>'prezzo_unitario')::numeric, 0), 0)
      * (1 - least(greatest(coalesce((v_row->>'sconto_percent')::numeric, 0), 0), 100) / 100),
      2
    );
    v_row_iva := round(v_row_imponibile * greatest(coalesce((v_row->>'iva_percent')::numeric, 22), 0) / 100, 2);
    v_row_totale := round(v_row_imponibile + v_row_iva, 2);

    insert into public.invoice_rows (
      invoice_id, tipo, descrizione, quantita, prezzo_unitario, sconto_percent, iva_percent,
      imponibile, iva, totale, ricambio_id, lavorazione_id, preventivo_id, meta
    )
    values (
      v_invoice_id,
      coalesce(nullif(v_row->>'tipo', ''), 'libera'),
      coalesce(nullif(trim(v_row->>'descrizione'), ''), 'Riga fattura'),
      greatest(coalesce((v_row->>'quantita')::numeric, 1), 0.001),
      greatest(coalesce((v_row->>'prezzo_unitario')::numeric, 0), 0),
      least(greatest(coalesce((v_row->>'sconto_percent')::numeric, 0), 0), 100),
      greatest(coalesce((v_row->>'iva_percent')::numeric, 22), 0),
      v_row_imponibile,
      v_row_iva,
      v_row_totale,
      nullif(v_row->>'ricambio_id', '')::uuid,
      nullif(v_row->>'lavorazione_id', '')::uuid,
      nullif(v_row->>'preventivo_id', '')::uuid,
      coalesce(v_row->'meta', '{}'::jsonb)
    );

    v_imponibile := v_imponibile + v_row_imponibile;
    v_iva := v_iva + v_row_iva;
    v_totale := v_totale + v_row_totale;
  end loop;

  if v_totale <= 0 then
    raise exception 'La fattura deve contenere almeno una riga con importo positivo';
  end if;

  for v_link in select * from jsonb_array_elements(coalesce(p_payload->'links', '[]'::jsonb))
  loop
    insert into public.invoice_links (
      invoice_id, source_type, source_id, allocated_imponibile, allocated_iva, allocated_totale, meta
    )
    values (
      v_invoice_id,
      coalesce(nullif(v_link->>'source_type', ''), 'preventivo'),
      (v_link->>'source_id')::uuid,
      greatest(coalesce((v_link->>'allocated_imponibile')::numeric, 0), 0),
      greatest(coalesce((v_link->>'allocated_iva')::numeric, 0), 0),
      greatest(coalesce((v_link->>'allocated_totale')::numeric, 0), 0),
      coalesce(v_link->'meta', '{}'::jsonb)
    );
  end loop;

  perform public.assert_invoice_preventivo_allocations(v_invoice_id);

  update public.invoices
  set imponibile = round(v_imponibile, 2),
      iva = round(v_iva, 2),
      totale = round(v_totale, 2),
      residuo = round(v_totale, 2),
      updated_by = v_uid
  where id = v_invoice_id;

  return v_invoice_id;
end;
$$;

create or replace function public.register_invoice_payment(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_invoice_id uuid;
  v_payment_id uuid;
  v_importo numeric;
  v_paid numeric;
  v_total numeric;
  v_status text;
  v_due date;
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  v_invoice_id := (p_payload->>'invoice_id')::uuid;
  v_importo := (p_payload->>'importo')::numeric;
  if v_importo <= 0 then
    raise exception 'Importo pagamento non valido';
  end if;

  select totale, status, data_scadenza into v_total, v_status, v_due
  from public.invoices
  where id = v_invoice_id
  for update;

  if v_status is null then
    raise exception 'Fattura non trovata';
  end if;
  if v_status in ('bozza', 'da_verificare', 'annullata') then
    raise exception 'Pagamento non consentito per lo stato fattura corrente';
  end if;

  insert into public.invoice_payments (invoice_id, data, importo, metodo, riferimento, note, created_by)
  values (
    v_invoice_id,
    coalesce(nullif(p_payload->>'data', '')::date, current_date),
    v_importo,
    coalesce(nullif(p_payload->>'metodo', ''), 'bonifico'),
    nullif(p_payload->>'riferimento', ''),
    nullif(p_payload->>'note', ''),
    v_uid
  )
  returning id into v_payment_id;

  select coalesce(sum(importo), 0) into v_paid
  from public.invoice_payments
  where invoice_id = v_invoice_id;

  update public.invoices
  set pagato = least(round(v_paid, 2), totale),
      residuo = greatest(round(totale - v_paid, 2), 0),
      status = public.invoice_recalculate_status(totale, v_paid, data_scadenza, status),
      updated_by = v_uid
  where id = v_invoice_id;

  return v_payment_id;
end;
$$;

create or replace function public.cancel_invoice(p_invoice_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
begin
  if not public.rbac_module_can('fatturazione', 'admin') then
    raise exception 'Permesso negato';
  end if;

  update public.invoices
  set status = 'annullata',
      annullata_at = now(),
      admin_notes = trim(coalesce(admin_notes || E'\n', '') || coalesce(p_reason, '')),
      updated_by = v_uid
  where id = p_invoice_id and status <> 'annullata';

  if not found then
    raise exception 'Fattura non trovata o già annullata';
  end if;
end;
$$;

create or replace view public.preventivi_billing_status as
select
  p.id as preventivo_id,
  p.totale as preventivo_totale,
  coalesce(sum(il.allocated_totale) filter (where i.status <> 'annullata'), 0)::numeric(14, 2) as fatturato,
  greatest(p.totale - coalesce(sum(il.allocated_totale) filter (where i.status <> 'annullata'), 0), 0)::numeric(14, 2) as residuo,
  case
    when coalesce(sum(il.allocated_totale) filter (where i.status <> 'annullata'), 0) <= 0 then 'non_fatturato'
    when coalesce(sum(il.allocated_totale) filter (where i.status <> 'annullata'), 0) < p.totale then 'parzialmente_fatturato'
    else 'totalmente_fatturato'
  end as stato_fatturazione
from public.preventivi p
left join public.invoice_links il on il.source_type = 'preventivo' and il.source_id = p.id
left join public.invoices i on i.id = il.invoice_id
group by p.id, p.totale;

grant select on public.preventivi_billing_status to authenticated;
grant execute on function public.create_invoice_with_rows_and_links(jsonb) to authenticated;
grant execute on function public.register_invoice_payment(jsonb) to authenticated;
grant execute on function public.cancel_invoice(uuid, text) to authenticated;
grant execute on function public.invoice_preventivo_allocated_total(uuid, uuid) to authenticated;
