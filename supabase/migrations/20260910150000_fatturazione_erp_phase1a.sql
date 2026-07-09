-- ERP Fatturazione Hub — Fase 1A: assi stato, partite, pagamenti, eventi, transizioni dominio.
begin;

-- ---------------------------------------------------------------------------
-- Colonne invoices (assi + metadati workflow)
-- ---------------------------------------------------------------------------
alter table public.invoices
  add column if not exists document_type text not null default 'fattura',
  add column if not exists document_status text,
  add column if not exists payment_status text,
  add column if not exists sdi_status text,
  add column if not exists accounting_status text not null default 'non_rilevante',
  add column if not exists parent_invoice_id uuid references public.invoices (id) on delete set null,
  add column if not exists sent_to_customer_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles (id) on delete set null,
  add column if not exists closed_at timestamptz;

alter table public.invoices drop constraint if exists invoices_document_type_chk;
alter table public.invoices add constraint invoices_document_type_chk check (
  document_type in ('fattura', 'nota_credito', 'proforma')
);

alter table public.invoices drop constraint if exists invoices_document_status_chk;
alter table public.invoices add constraint invoices_document_status_chk check (
  document_status is null or document_status in ('bozza', 'da_verificare', 'approvata', 'emessa', 'annullata')
);

alter table public.invoices drop constraint if exists invoices_payment_status_chk;
alter table public.invoices add constraint invoices_payment_status_chk check (
  payment_status is null or payment_status in ('non_pagata', 'parzialmente_pagata', 'pagata', 'scaduta')
);

alter table public.invoices drop constraint if exists invoices_sdi_status_chk;
alter table public.invoices add constraint invoices_sdi_status_chk check (
  sdi_status is null or sdi_status in (
    'non_applicabile', 'da_generare', 'generata', 'inviata', 'consegnata', 'scartata', 'rifiutata'
  )
);

alter table public.invoices drop constraint if exists invoices_accounting_status_chk;
alter table public.invoices add constraint invoices_accounting_status_chk check (
  accounting_status in (
    'non_rilevante', 'da_registrare', 'registrata', 'da_liquidare', 'liquidata', 'chiusa', 'contestata'
  )
);

create index if not exists idx_invoices_document_status on public.invoices (document_status);
create index if not exists idx_invoices_payment_status on public.invoices (payment_status);
create index if not exists idx_invoices_document_type on public.invoices (document_type);
create index if not exists idx_invoices_parent_invoice_id on public.invoices (parent_invoice_id) where parent_invoice_id is not null;

comment on column public.invoices.document_status is 'Asse ciclo documento (SSOT scrittura via invoice_apply_transition).';
comment on column public.invoices.payment_status is 'Asse incasso fattura; credito cliente su customer_open_items.';
comment on column public.invoices.sdi_status is 'Asse fatturazione elettronica SdI.';

-- ---------------------------------------------------------------------------
-- Partite cliente (segno: + credito cliente, - debito cliente)
-- ---------------------------------------------------------------------------
create table if not exists public.customer_open_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.billing_customers (id) on delete set null,
  source_type text not null,
  source_id uuid,
  invoice_id uuid references public.invoices (id) on delete set null,
  document_number text,
  currency text not null default 'EUR',
  amount_signed numeric(14, 2) not null,
  remaining_signed numeric(14, 2) not null,
  due_date date,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_open_items_source_type_chk check (
    source_type in ('invoice', 'credit_note', 'customer_advance', 'manual_adjustment')
  ),
  constraint customer_open_items_status_chk check (status in ('open', 'partial', 'closed')),
  constraint customer_open_items_currency_chk check (char_length(trim(currency)) = 3)
);

comment on column public.customer_open_items.amount_signed is 'Positivo = credito cliente; negativo = debito cliente.';
comment on column public.customer_open_items.remaining_signed is 'Residuo con stessa convenzione di amount_signed.';

drop trigger if exists trg_customer_open_items_updated_at on public.customer_open_items;
create trigger trg_customer_open_items_updated_at
before update on public.customer_open_items
for each row execute function public.set_updated_at();

create index if not exists idx_customer_open_items_customer on public.customer_open_items (customer_id);
create index if not exists idx_customer_open_items_due_date on public.customer_open_items (due_date) where status <> 'closed';
create index if not exists idx_customer_open_items_invoice on public.customer_open_items (invoice_id) where invoice_id is not null;
create index if not exists idx_customer_open_items_remaining on public.customer_open_items (remaining_signed) where status <> 'closed';

-- ---------------------------------------------------------------------------
-- Pagamenti cliente + allocazioni (no invoice_id diretto)
-- ---------------------------------------------------------------------------
create table if not exists public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.billing_customers (id) on delete set null,
  data date not null default current_date,
  importo numeric(14, 2) not null,
  metodo text not null default 'bonifico',
  riferimento text,
  note text,
  allocation_status text not null default 'unallocated',
  legacy_invoice_payment_id uuid references public.invoice_payments (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_payments_importo_chk check (importo > 0),
  constraint customer_payments_metodo_chk check (metodo in ('bonifico', 'contanti', 'assegno', 'pos', 'altro')),
  constraint customer_payments_allocation_status_chk check (
    allocation_status in ('unallocated', 'partial', 'allocated')
  )
);

drop trigger if exists trg_customer_payments_updated_at on public.customer_payments;
create trigger trg_customer_payments_updated_at
before update on public.customer_payments
for each row execute function public.set_updated_at();

create index if not exists idx_customer_payments_customer on public.customer_payments (customer_id, data desc);
create index if not exists idx_customer_payments_allocation on public.customer_payments (allocation_status)
  where allocation_status <> 'allocated';

create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.customer_payments (id) on delete cascade,
  open_item_id uuid not null references public.customer_open_items (id) on delete restrict,
  amount numeric(14, 2) not null,
  rounding_delta numeric(14, 4) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  constraint payment_allocations_amount_chk check (amount > 0),
  constraint payment_allocations_uq unique (payment_id, open_item_id)
);

create index if not exists idx_payment_allocations_open_item on public.payment_allocations (open_item_id);

create or replace view public.payment_allocations_expanded
with (security_invoker = true) as
select
  pa.id as allocation_id,
  pa.payment_id,
  pa.open_item_id,
  pa.amount,
  pa.rounding_delta,
  pa.note,
  pa.created_at as allocated_at,
  cp.customer_id,
  cp.data as payment_date,
  cp.importo as payment_total,
  cp.metodo as payment_method,
  cp.allocation_status,
  coi.source_type,
  coi.source_id,
  coi.invoice_id,
  coi.document_number,
  coi.remaining_signed,
  coi.due_date,
  coi.currency
from public.payment_allocations pa
join public.customer_payments cp on cp.id = pa.payment_id
join public.customer_open_items coi on coi.id = pa.open_item_id;

-- ---------------------------------------------------------------------------
-- Eventi dominio (timeline + audit strutturato)
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  invoice_id uuid references public.invoices (id) on delete set null,
  event_category text not null,
  event_type text not null,
  correlation_id uuid not null default gen_random_uuid(),
  causation_id uuid references public.invoice_events (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint invoice_events_payload_obj_chk check (jsonb_typeof(payload) = 'object')
);

create index if not exists idx_invoice_events_invoice on public.invoice_events (invoice_id, created_at desc);
create index if not exists idx_invoice_events_correlation on public.invoice_events (correlation_id);
create index if not exists idx_invoice_events_aggregate on public.invoice_events (aggregate_type, aggregate_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Relazioni documento + anagrafica fiscale + numerazione (predisposto)
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_relations (
  id uuid primary key default gen_random_uuid(),
  source_invoice_id uuid not null references public.invoices (id) on delete cascade,
  target_invoice_id uuid not null references public.invoices (id) on delete cascade,
  relation_type text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint invoice_relations_type_chk check (relation_type in ('credit_note', 'correction', 'replacement')),
  constraint invoice_relations_distinct_chk check (source_invoice_id <> target_invoice_id),
  constraint invoice_relations_uq unique (source_invoice_id, target_invoice_id, relation_type)
);

create table if not exists public.billing_customer_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.billing_customers (id) on delete cascade,
  tipo_cliente text,
  regime_fiscale text,
  split_payment boolean not null default false,
  natura_iva_default text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_billing_customer_profiles_updated_at on public.billing_customer_profiles;
create trigger trg_billing_customer_profiles_updated_at
before update on public.billing_customer_profiles
for each row execute function public.set_updated_at();

create table if not exists public.invoice_number_sequences (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  document_type text not null,
  series text not null default 'default',
  last_number integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_number_sequences_year_chk check (year between 2000 and 2100),
  constraint invoice_number_sequences_document_type_chk check (
    document_type in ('fattura', 'nota_credito', 'proforma')
  ),
  constraint invoice_number_sequences_uq unique (year, document_type, series)
);

create table if not exists public.business_documents (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  entity_id uuid not null,
  entity_table text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Legacy status derivation (unidirezionale assi → status)
-- ---------------------------------------------------------------------------
create or replace function public.invoice_derive_legacy_status(
  p_document_status text,
  p_payment_status text,
  p_sent_to_customer_at timestamptz,
  p_data_scadenza date
)
returns text
language plpgsql
stable
set search_path = public
as $$
begin
  if p_document_status = 'annullata' then
    return 'annullata';
  end if;
  if p_document_status = 'bozza' then
    return 'bozza';
  end if;
  if p_document_status = 'da_verificare' then
    return 'da_verificare';
  end if;

  if p_payment_status = 'pagata' then
    return 'pagata';
  end if;
  if p_payment_status = 'parzialmente_pagata' then
    return 'parzialmente_pagata';
  end if;
  if p_payment_status = 'scaduta' then
    return 'scaduta';
  end if;
  if p_sent_to_customer_at is not null then
    return 'inviata';
  end if;
  return 'emessa';
end;
$$;

create or replace function public.invoice_map_legacy_to_axes(p_status text)
returns table (
  new_document_status text,
  new_payment_status text,
  new_sdi_status text,
  set_sent_to_customer boolean
)
language plpgsql
stable
set search_path = public
as $$
begin
  case p_status
    when 'bozza' then
      return query select 'bozza'::text, 'non_pagata'::text, 'non_applicabile'::text, false;
    when 'da_verificare' then
      return query select 'da_verificare'::text, 'non_pagata'::text, 'non_applicabile'::text, false;
    when 'emessa' then
      return query select 'emessa'::text, 'non_pagata'::text, 'da_generare'::text, false;
    when 'inviata' then
      return query select 'emessa'::text, 'non_pagata'::text, 'da_generare'::text, true;
    when 'parzialmente_pagata' then
      return query select 'emessa'::text, 'parzialmente_pagata'::text, 'da_generare'::text, false;
    when 'pagata' then
      return query select 'emessa'::text, 'pagata'::text, 'da_generare'::text, false;
    when 'scaduta' then
      return query select 'emessa'::text, 'scaduta'::text, 'da_generare'::text, false;
    when 'annullata' then
      return query select 'annullata'::text, 'non_pagata'::text, 'non_applicabile'::text, false;
    else
      return query select 'bozza'::text, 'non_pagata'::text, 'non_applicabile'::text, false;
  end case;
end;
$$;

create or replace function public.invoice_status_migration_report()
returns table (
  invoice_id uuid,
  numero integer,
  anno integer,
  old_status text,
  new_document_status text,
  new_payment_status text,
  note text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id,
    i.numero,
    i.anno,
    i.status as old_status,
    m.new_document_status,
    m.new_payment_status,
    case
      when i.status = 'inviata' then 'sent_to_customer_at will be set'
      else null
    end as note
  from public.invoices i
  cross join lateral public.invoice_map_legacy_to_axes(i.status) m
  order by i.anno desc, i.numero desc;
$$;

create or replace function public.apply_invoice_status_backfill()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
  v_doc text;
  v_pay text;
  v_sdi text;
  v_sent boolean;
begin
  if not public.rbac_module_can('fatturazione', 'admin') then
    raise exception 'Permesso negato';
  end if;

  for r in select id, status, totale, residuo, pagato, data_scadenza, customer_id, numero, anno, cliente_label
           from public.invoices
  loop
    select m.new_document_status, m.new_payment_status, m.new_sdi_status, m.set_sent_to_customer
    into v_doc, v_pay, v_sdi, v_sent
    from public.invoice_map_legacy_to_axes(r.status) m;

    update public.invoices
    set document_status = v_doc,
        payment_status = v_pay,
        sdi_status = v_sdi,
        sent_to_customer_at = case when v_sent and sent_to_customer_at is null then now() else sent_to_customer_at end,
        document_type = coalesce(document_type, 'fattura'),
        accounting_status = coalesce(accounting_status, 'non_rilevante')
    where id = r.id;

  -- open items per fatture emesse non annullate
    if v_doc = 'emessa' and r.totale > 0 then
      insert into public.customer_open_items (
        customer_id, source_type, source_id, invoice_id, document_number,
        amount_signed, remaining_signed, due_date, status
      )
      select
        r.customer_id,
        case when coalesce(i.document_type, 'fattura') = 'nota_credito' then 'credit_note' else 'invoice' end,
        r.id,
        r.id,
        i.anno::text || '/' || i.numero::text,
        case when coalesce(i.document_type, 'fattura') = 'nota_credito' then r.totale else -r.totale end,
        case when coalesce(i.document_type, 'fattura') = 'nota_credito' then r.residuo else -r.residuo end,
        r.data_scadenza,
        case when r.residuo <= 0 then 'closed' when r.pagato > 0 then 'partial' else 'open' end
      from public.invoices i
      where i.id = r.id
        and not exists (
          select 1 from public.customer_open_items coi where coi.invoice_id = r.id
        );
    end if;

    v_count := v_count + 1;
  end loop;

  -- backfill customer_payments da invoice_payments legacy
  insert into public.customer_payments (
    customer_id, data, importo, metodo, riferimento, note, allocation_status, legacy_invoice_payment_id, created_by
  )
  select
    i.customer_id,
    ip.data,
    ip.importo,
    ip.metodo,
    ip.riferimento,
    ip.note,
    'allocated',
    ip.id,
    ip.created_by
  from public.invoice_payments ip
  join public.invoices i on i.id = ip.invoice_id
  where not exists (
    select 1 from public.customer_payments cp where cp.legacy_invoice_payment_id = ip.id
  );

  insert into public.payment_allocations (payment_id, open_item_id, amount)
  select cp.id, coi.id, least(cp.importo, abs(coi.remaining_signed))
  from public.customer_payments cp
  join public.invoice_payments ip on ip.id = cp.legacy_invoice_payment_id
  join public.customer_open_items coi on coi.invoice_id = ip.invoice_id
  where not exists (
    select 1 from public.payment_allocations pa where pa.payment_id = cp.id and pa.open_item_id = coi.id
  );

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Guard: vietato aggiornare status senza assi
-- ---------------------------------------------------------------------------
create or replace function public.invoice_guard_direct_status_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and new.document_status is not distinct from old.document_status
     and new.payment_status is not distinct from old.payment_status
     and new.sent_to_customer_at is not distinct from old.sent_to_customer_at
  then
    raise exception 'Aggiornamento diretto di invoices.status non consentito; usare invoice_apply_transition';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoices_guard_status on public.invoices;
create trigger trg_invoices_guard_status
before update of status on public.invoices
for each row execute function public.invoice_guard_direct_status_update();

create or replace function public.invoice_sync_legacy_status_from_axes()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_legacy text;
begin
  if new.document_status is null and new.payment_status is null then
    return new;
  end if;

  v_legacy := public.invoice_derive_legacy_status(
    coalesce(new.document_status, old.document_status),
    coalesce(new.payment_status, old.payment_status),
    coalesce(new.sent_to_customer_at, old.sent_to_customer_at),
    coalesce(new.data_scadenza, old.data_scadenza)
  );

  if new.status is distinct from v_legacy then
    new.status := v_legacy;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoices_sync_legacy_status on public.invoices;
create trigger trg_invoices_sync_legacy_status
before insert or update of document_status, payment_status, sent_to_customer_at, data_scadenza
on public.invoices
for each row execute function public.invoice_sync_legacy_status_from_axes();

create or replace function public.invoice_init_axes_from_legacy_on_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  m record;
begin
  if new.document_status is not null then
    return new;
  end if;
  select * into m from public.invoice_map_legacy_to_axes(new.status);
  new.document_status := m.new_document_status;
  new.payment_status := m.new_payment_status;
  new.sdi_status := m.new_sdi_status;
  if m.set_sent_to_customer and new.sent_to_customer_at is null then
    new.sent_to_customer_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoices_init_axes on public.invoices;
create trigger trg_invoices_init_axes
before insert on public.invoices
for each row execute function public.invoice_init_axes_from_legacy_on_insert();

-- ---------------------------------------------------------------------------
-- Event helper + transizione dominio
-- ---------------------------------------------------------------------------
create or replace function public.invoice_insert_event(
  p_entity_type text,
  p_entity_id uuid,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_invoice_id uuid,
  p_event_category text,
  p_event_type text,
  p_correlation_id uuid,
  p_causation_id uuid,
  p_payload jsonb,
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.invoice_events (
    entity_type, entity_id, aggregate_type, aggregate_id, invoice_id,
    event_category, event_type, correlation_id, causation_id, payload, actor_id
  )
  values (
    p_entity_type, p_entity_id, p_aggregate_type, p_aggregate_id, p_invoice_id,
    p_event_category, p_event_type, p_correlation_id, p_causation_id, coalesce(p_payload, '{}'::jsonb), p_actor_id
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.invoice_apply_transition(
  p_invoice_id uuid,
  p_transition text,
  p_payload jsonb default '{}'::jsonb,
  p_actor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(p_actor_id, public.rbac_auth_uid());
  v_inv record;
  v_corr uuid := gen_random_uuid();
  v_prev_event uuid;
  v_doc text;
  v_pay text;
  v_sdi text;
  v_open_id uuid;
  v_reason text;
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Fattura non trovata';
  end if;

  v_doc := coalesce(v_inv.document_status, (select m.new_document_status from public.invoice_map_legacy_to_axes(v_inv.status) m));
  v_pay := coalesce(v_inv.payment_status, (select m.new_payment_status from public.invoice_map_legacy_to_axes(v_inv.status) m));
  v_sdi := coalesce(v_inv.sdi_status, (select m.new_sdi_status from public.invoice_map_legacy_to_axes(v_inv.status) m));

  case p_transition
    when 'submit_for_review' then
      if v_doc not in ('bozza') then raise exception 'Transizione non consentita'; end if;
      v_doc := 'da_verificare';
    when 'approve' then
      if v_doc not in ('da_verificare', 'bozza') then raise exception 'Transizione non consentita'; end if;
      v_doc := 'approvata';
      update public.invoices set approved_at = now(), approved_by = v_uid where id = p_invoice_id;
    when 'emit' then
      if v_doc in ('annullata', 'emessa') and v_inv.status not in ('bozza', 'da_verificare') then
        raise exception 'Transizione non consentita';
      end if;
      v_doc := 'emessa';
      v_pay := coalesce(nullif(v_pay, ''), 'non_pagata');
      v_sdi := case when v_sdi = 'non_applicabile' then 'da_generare' else v_sdi end;
      -- open item debito
      if v_inv.totale > 0 and not exists (select 1 from public.customer_open_items where invoice_id = p_invoice_id) then
        insert into public.customer_open_items (
          customer_id, source_type, source_id, invoice_id, document_number,
          amount_signed, remaining_signed, due_date, status
        )
        values (
          v_inv.customer_id, 'invoice', p_invoice_id, p_invoice_id,
          v_inv.anno::text || '/' || v_inv.numero::text,
          -v_inv.totale, -v_inv.residuo, v_inv.data_scadenza,
          case when v_inv.residuo <= 0 then 'closed' when v_inv.pagato > 0 then 'partial' else 'open' end
        )
        returning id into v_open_id;
      end if;
    when 'mark_sent_to_customer' then
      update public.invoices set sent_to_customer_at = coalesce(sent_to_customer_at, now()), updated_by = v_uid where id = p_invoice_id;
      v_prev_event := public.invoice_insert_event(
        'invoice', p_invoice_id, 'invoice', p_invoice_id, p_invoice_id,
        'document', 'customer_sent', v_corr, null,
        jsonb_build_object('transition', p_transition), v_uid
      );
      return;
    when 'cancel' then
      if v_doc = 'annullata' then raise exception 'Fattura già annullata'; end if;
      v_doc := 'annullata';
      v_reason := nullif(p_payload->>'reason', '');
      update public.invoices
      set annullata_at = now(),
          admin_notes = trim(coalesce(admin_notes || E'\n', '') || coalesce(v_reason, '')),
          updated_by = v_uid
      where id = p_invoice_id;
      update public.customer_open_items
      set remaining_signed = 0, status = 'closed', updated_at = now()
      where invoice_id = p_invoice_id and status <> 'closed';
    when 'mark_overdue' then
      if v_doc <> 'emessa' then raise exception 'Transizione non consentita'; end if;
      v_pay := 'scaduta';
    else
      raise exception 'Transizione sconosciuta: %', p_transition;
  end case;

  update public.invoices
  set document_status = v_doc,
      payment_status = v_pay,
      sdi_status = v_sdi,
      updated_by = v_uid
  where id = p_invoice_id;

  v_prev_event := public.invoice_insert_event(
    'invoice', p_invoice_id, 'invoice', p_invoice_id, p_invoice_id,
    'document', 'status_changed', v_corr, null,
    jsonb_build_object(
      'transition', p_transition,
      'document_status', v_doc,
      'payment_status', v_pay,
      'sdi_status', v_sdi
    ),
    v_uid
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC legacy → transizioni dominio
-- ---------------------------------------------------------------------------
create or replace function public.cancel_invoice(p_invoice_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.invoice_apply_transition(
    p_invoice_id,
    'cancel',
    jsonb_build_object('reason', coalesce(p_reason, '')),
    public.rbac_auth_uid()
  );
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
  v_customer_payment_id uuid;
  v_importo numeric;
  v_paid numeric;
  v_total numeric;
  v_status text;
  v_doc text;
  v_pay text;
  v_customer_id uuid;
  v_open_item_id uuid;
  v_corr uuid := gen_random_uuid();
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  v_invoice_id := (p_payload->>'invoice_id')::uuid;
  v_importo := (p_payload->>'importo')::numeric;
  if v_importo <= 0 then
    raise exception 'Importo pagamento non valido';
  end if;

  select totale, status, document_status, payment_status, customer_id
  into v_total, v_status, v_doc, v_pay, v_customer_id
  from public.invoices
  where id = v_invoice_id
  for update;

  if v_status is null then
    raise exception 'Fattura non trovata';
  end if;
  if coalesce(v_doc, v_status) in ('bozza', 'da_verificare', 'annullata') then
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

  v_pay := case
    when round(v_total - v_paid, 2) <= 0 and v_total > 0 then 'pagata'
    when v_paid > 0 then 'parzialmente_pagata'
    else coalesce(v_pay, 'non_pagata')
  end;

  update public.invoices
  set pagato = least(round(v_paid, 2), totale),
      residuo = greatest(round(totale - v_paid, 2), 0),
      payment_status = v_pay,
      document_status = coalesce(document_status, 'emessa'),
      updated_by = v_uid
  where id = v_invoice_id;

  select id into v_open_item_id from public.customer_open_items where invoice_id = v_invoice_id limit 1;
  if v_open_item_id is null and v_total > 0 then
    insert into public.customer_open_items (
      customer_id, source_type, source_id, invoice_id, document_number,
      amount_signed, remaining_signed, due_date, status
    )
    select customer_id, 'invoice', v_invoice_id, v_invoice_id, anno::text || '/' || numero::text,
           -totale, -greatest(round(totale - v_paid, 2), 0), data_scadenza,
           case when round(totale - v_paid, 2) <= 0 then 'closed' when v_paid > 0 then 'partial' else 'open' end
    from public.invoices where id = v_invoice_id
    returning id into v_open_item_id;
  elsif v_open_item_id is not null then
    update public.customer_open_items
    set remaining_signed = -greatest(round(v_total - v_paid, 2), 0),
        status = case when round(v_total - v_paid, 2) <= 0 then 'closed' when v_paid > 0 then 'partial' else status end,
        updated_at = now()
    where id = v_open_item_id;
  end if;

  insert into public.customer_payments (
    customer_id, data, importo, metodo, riferimento, note, allocation_status, legacy_invoice_payment_id, created_by
  )
  select customer_id, coalesce(nullif(p_payload->>'data', '')::date, current_date), v_importo,
         coalesce(nullif(p_payload->>'metodo', ''), 'bonifico'),
         nullif(p_payload->>'riferimento', ''), nullif(p_payload->>'note', ''),
         'allocated', v_payment_id, v_uid
  from public.invoices where id = v_invoice_id
  returning id into v_customer_payment_id;

  if v_open_item_id is not null then
    insert into public.payment_allocations (payment_id, open_item_id, amount)
    values (v_customer_payment_id, v_open_item_id, v_importo)
    on conflict (payment_id, open_item_id) do update set amount = excluded.amount;
  end if;

  perform public.invoice_insert_event(
    'invoice_payment', v_payment_id, 'invoice', v_invoice_id, v_invoice_id,
    'payment', 'payment_registered', v_corr, null,
    jsonb_build_object('importo', v_importo, 'customer_payment_id', v_customer_payment_id),
    v_uid
  );

  return v_payment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS nuove tabelle (allineato modulo fatturazione)
-- ---------------------------------------------------------------------------
alter table public.customer_open_items enable row level security;
alter table public.customer_payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.invoice_events enable row level security;
alter table public.invoice_relations enable row level security;
alter table public.billing_customer_profiles enable row level security;
alter table public.invoice_number_sequences enable row level security;
alter table public.business_documents enable row level security;

drop policy if exists cap_customer_open_items_select on public.customer_open_items;
create policy cap_customer_open_items_select on public.customer_open_items for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_customer_open_items_write on public.customer_open_items;
create policy cap_customer_open_items_write on public.customer_open_items for all to authenticated
using (public.rbac_module_can('fatturazione', 'write'))
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_customer_payments_select on public.customer_payments;
create policy cap_customer_payments_select on public.customer_payments for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_customer_payments_write on public.customer_payments;
create policy cap_customer_payments_write on public.customer_payments for all to authenticated
using (public.rbac_module_can('fatturazione', 'write'))
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_payment_allocations_select on public.payment_allocations;
create policy cap_payment_allocations_select on public.payment_allocations for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_payment_allocations_write on public.payment_allocations;
create policy cap_payment_allocations_write on public.payment_allocations for all to authenticated
using (public.rbac_module_can('fatturazione', 'write'))
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoice_events_select on public.invoice_events;
create policy cap_invoice_events_select on public.invoice_events for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_invoice_events_insert on public.invoice_events;
create policy cap_invoice_events_insert on public.invoice_events for insert to authenticated
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoice_relations_select on public.invoice_relations;
create policy cap_invoice_relations_select on public.invoice_relations for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_invoice_relations_write on public.invoice_relations;
create policy cap_invoice_relations_write on public.invoice_relations for all to authenticated
using (public.rbac_module_can('fatturazione', 'write'))
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_billing_customer_profiles_select on public.billing_customer_profiles;
create policy cap_billing_customer_profiles_select on public.billing_customer_profiles for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_billing_customer_profiles_write on public.billing_customer_profiles;
create policy cap_billing_customer_profiles_write on public.billing_customer_profiles for all to authenticated
using (public.rbac_module_can('fatturazione', 'write'))
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_invoice_number_sequences_select on public.invoice_number_sequences;
create policy cap_invoice_number_sequences_select on public.invoice_number_sequences for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_invoice_number_sequences_write on public.invoice_number_sequences;
create policy cap_invoice_number_sequences_write on public.invoice_number_sequences for all to authenticated
using (public.rbac_module_can('fatturazione', 'admin'))
with check (public.rbac_module_can('fatturazione', 'admin'));

drop policy if exists cap_business_documents_select on public.business_documents;
create policy cap_business_documents_select on public.business_documents for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

grant select on public.payment_allocations_expanded to authenticated;
grant execute on function public.invoice_status_migration_report() to authenticated;
grant execute on function public.apply_invoice_status_backfill() to authenticated;
grant execute on function public.invoice_apply_transition(uuid, text, jsonb, uuid) to authenticated;

commit;
