-- FASE 6 — Centralized document numbering engine (FT / NC / DDT)
begin;

-- ---------------------------------------------------------------------------
-- Series normalization SSOT
-- ---------------------------------------------------------------------------
create or replace function public.normalize_document_series(p_series text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_series is null or trim(p_series) = '' then 'DEFAULT'
    else upper(trim(p_series))
  end;
$$;

comment on function public.normalize_document_series(text) is
  'FASE 6 — Canonical series; empty/null → DEFAULT.';

-- ---------------------------------------------------------------------------
-- Display formatter (SQL mirror of lib/document-numbering/format-document-number.ts)
-- ---------------------------------------------------------------------------
create or replace function public.format_document_number(
  p_document_type text,
  p_fiscal_year integer,
  p_series text,
  p_number integer
)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_series text := public.normalize_document_series(p_series);
  v_padded text := lpad(p_number::text, 3, '0');
begin
  if p_number is null or p_number <= 0 then
    return 'Bozza';
  end if;

  case p_document_type
    when 'fattura' then
      return 'FT ' || p_fiscal_year::text || '/' || v_padded;
    when 'nota_credito' then
      return 'NC ' || p_fiscal_year::text || '/' || v_padded;
    when 'ddt' then
      if v_series = 'DEFAULT' then
        return 'DDT ' || p_fiscal_year::text || '/' || v_padded;
      end if;
      return 'DDT ' || v_series || '/' || p_fiscal_year::text || '/' || v_padded;
    else
      raise exception 'Tipo documento non supportato per format_document_number: %', p_document_type;
  end case;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sequence table SSOT
-- ---------------------------------------------------------------------------
create table if not exists public.document_number_sequences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  document_type text not null,
  fiscal_year integer not null,
  series text not null default 'DEFAULT',
  current_number integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_number_sequences_document_type_chk check (
    document_type in ('fattura', 'nota_credito', 'ddt')
  ),
  constraint document_number_sequences_fiscal_year_chk check (
    fiscal_year between 2000 and 2100
  ),
  constraint document_number_sequences_current_number_chk check (current_number >= 0),
  constraint document_number_sequences_uq unique (company_id, document_type, fiscal_year, series)
);

comment on table public.document_number_sequences is
  'FASE 6 — SSOT progressivi fiscali FT/NC/DDT per (company, type, year, series).';

revoke all on table public.document_number_sequences from public, anon, authenticated;
alter table public.document_number_sequences enable row level security;

drop trigger if exists trg_document_number_sequences_updated_at on public.document_number_sequences;
create trigger trg_document_number_sequences_updated_at
before update on public.document_number_sequences
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Invoices schema: company_id, series, nullable numero (draft)
-- ---------------------------------------------------------------------------
alter table public.invoices
  add column if not exists company_id uuid references public.companies (id) on delete restrict,
  add column if not exists series text;

update public.invoices
set company_id = coalesce(company_id, '00000000-0000-4000-8000-000000000001'::uuid),
    series = public.normalize_document_series(series)
where company_id is null or series is null or series <> public.normalize_document_series(series);

alter table public.invoices
  alter column company_id set default '00000000-0000-4000-8000-000000000001'::uuid;

alter table public.invoices
  alter column company_id set not null,
  alter column series set default 'DEFAULT',
  alter column series set not null;

alter table public.invoices
  alter column numero drop not null;

alter table public.invoices drop constraint if exists invoices_numero_chk;
alter table public.invoices add constraint invoices_numero_chk check (numero is null or numero > 0);

drop index if exists public.idx_invoices_anno_numero_uq;

create unique index if not exists idx_invoices_number_uq
  on public.invoices (company_id, document_type, anno, series, numero)
  where numero is not null and coalesce(document_status, status) <> 'annullata';

-- ---------------------------------------------------------------------------
-- DDT series normalization
-- ---------------------------------------------------------------------------
update public.ddt_documents
set serie = public.normalize_document_series(serie)
where serie is distinct from public.normalize_document_series(serie);

alter table public.ddt_documents
  alter column serie set default 'DEFAULT';

-- ---------------------------------------------------------------------------
-- Conditional DDT seed from legacy counters / max documenti
-- ---------------------------------------------------------------------------
insert into public.document_number_sequences (company_id, document_type, fiscal_year, series, current_number)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  'ddt',
  dc.anno,
  public.normalize_document_series(dc.serie),
  greatest(dc.last_num, 0)
from public.ddt_numero_counters dc
on conflict (company_id, document_type, fiscal_year, series) do update
set current_number = greatest(public.document_number_sequences.current_number, excluded.current_number),
    updated_at = now();

insert into public.document_number_sequences (company_id, document_type, fiscal_year, series, current_number)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  'ddt',
  d.anno,
  public.normalize_document_series(d.serie),
  coalesce(max(d.numero), 0)
from public.ddt_documents d
where d.numero is not null and d.status <> 'annullato'
group by d.anno, public.normalize_document_series(d.serie)
on conflict (company_id, document_type, fiscal_year, series) do update
set current_number = greatest(public.document_number_sequences.current_number, excluded.current_number),
    updated_at = now();

-- ---------------------------------------------------------------------------
-- Internal allocator — NOT client-callable (no EXECUTE grants)
-- ---------------------------------------------------------------------------
create or replace function public.allocate_document_number(
  p_document_type text,
  p_fiscal_year integer,
  p_series text default 'DEFAULT',
  p_company_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid := coalesce(
    p_company_id,
    public.rbac_user_company_id(),
    '00000000-0000-4000-8000-000000000001'::uuid
  );
  v_series text := public.normalize_document_series(p_series);
  v_row record;
  v_next integer;
begin
  if p_document_type not in ('fattura', 'nota_credito', 'ddt') then
    raise exception 'Tipo documento numerazione non valido: %', p_document_type;
  end if;
  if p_fiscal_year < 2000 or p_fiscal_year > 2100 then
    raise exception 'Anno fiscale non valido: %', p_fiscal_year;
  end if;
  if v_series !~ '^[A-Z0-9_-]{1,16}$' then
    raise exception 'Serie documento non valida: %', v_series;
  end if;

  insert into public.document_number_sequences (company_id, document_type, fiscal_year, series, current_number)
  values (v_company, p_document_type, p_fiscal_year, v_series, 0)
  on conflict (company_id, document_type, fiscal_year, series) do nothing;

  select * into v_row
  from public.document_number_sequences
  where company_id = v_company
    and document_type = p_document_type
    and fiscal_year = p_fiscal_year
    and series = v_series
  for update;

  if not found then
    raise exception 'Sequence numerazione non trovata';
  end if;

  v_next := v_row.current_number + 1;

  update public.document_number_sequences
  set current_number = v_next, updated_at = now()
  where id = v_row.id;

  return v_next;
end;
$$;

comment on function public.allocate_document_number(text, integer, text, uuid) is
  'FASE 6 — Internal only. Chiamare solo da RPC documento nella stessa transazione.';

revoke all on function public.allocate_document_number(text, integer, text, uuid)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Immutability guards
-- ---------------------------------------------------------------------------
create or replace function public.invoice_guard_number_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.numero is not null
     and coalesce(old.document_status, old.status) not in ('bozza', 'da_verificare', null)
  then
    if new.numero is distinct from old.numero
       or new.anno is distinct from old.anno
       or new.series is distinct from old.series
       or new.document_type is distinct from old.document_type
    then
      raise exception 'Numerazione fattura immutabile dopo emissione';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoices_guard_number on public.invoices;
create trigger trg_invoices_guard_number
before update of numero, anno, series, document_type on public.invoices
for each row execute function public.invoice_guard_number_immutable();

create or replace function public.ddt_guard_number_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.numero is not null and old.status <> 'bozza' then
    if new.numero is distinct from old.numero
       or new.anno is distinct from old.anno
       or new.serie is distinct from old.serie
    then
      raise exception 'Numerazione DDT immutabile dopo conferma';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ddt_documents_guard_number on public.ddt_documents;
create trigger trg_ddt_documents_guard_number
before update of numero, anno, serie on public.ddt_documents
for each row execute function public.ddt_guard_number_immutable();

-- ---------------------------------------------------------------------------
-- create_invoice_with_rows_and_links — draft numero NULL, no MAX+1
-- ---------------------------------------------------------------------------
create or replace function public.create_invoice_with_rows_and_links(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_company uuid := coalesce(public.rbac_user_company_id(), '00000000-0000-4000-8000-000000000001'::uuid);
  v_invoice_id uuid;
  v_year integer;
  v_series text;
  v_status text;
  v_origine text;
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
  v_corr uuid := gen_random_uuid();
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  v_cliente_label := nullif(trim(p_payload->>'cliente_label'), '');
  if v_cliente_label is null then
    raise exception 'Cliente fattura obbligatorio';
  end if;

  v_status := coalesce(nullif(p_payload->>'status', ''), 'bozza');
  if v_status not in ('bozza', 'da_verificare') then
    raise exception 'Stato fattura iniziale non valido; usare invoice_apply_transition per emissione';
  end if;

  v_origine := nullif(p_payload->>'origine', '');
  if v_origine is not null and v_origine not in ('manuale', 'preventivo', 'multi_preventivo') then
    raise exception 'Origine fattura non valida';
  end if;

  v_data_emissione := coalesce(nullif(p_payload->>'data_emissione', '')::date, current_date);
  v_data_scadenza := nullif(p_payload->>'data_scadenza', '')::date;
  v_year := coalesce((p_payload->>'anno')::integer, extract(year from v_data_emissione)::integer);
  v_series := public.normalize_document_series(p_payload->>'series');
  v_customer_id := nullif(p_payload->>'customer_id', '')::uuid;
  v_customer_snapshot := coalesce(p_payload->'customer_snapshot', '{}'::jsonb);
  v_note := nullif(p_payload->>'note', '');
  v_admin_notes := nullif(p_payload->>'admin_notes', '');

  insert into public.invoices (
    company_id, numero, anno, series, status, origine, customer_id, cliente_label, customer_snapshot,
    data_emissione, data_scadenza, note, admin_notes, document_type, created_by, updated_by
  )
  values (
    v_company, null, v_year, v_series, v_status, v_origine, v_customer_id, v_cliente_label, v_customer_snapshot,
    v_data_emissione, v_data_scadenza, v_note, v_admin_notes, 'fattura', v_uid, v_uid
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

  perform public.invoice_insert_event(
    'invoice', v_invoice_id, 'invoice', v_invoice_id, v_invoice_id,
    'document', 'draft_created', v_corr, null,
    jsonb_build_object('status', v_status),
    v_uid
  );

  return v_invoice_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- invoice_apply_transition — emit allocates FT number
-- ---------------------------------------------------------------------------
create or replace function public.invoice_apply_transition(
  p_invoice_id uuid,
  p_transition text,
  p_payload jsonb default '{}'::jsonb,
  p_actor_id uuid default null,
  p_expected_version integer default null
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
  v_numero integer;
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Fattura non trovata';
  end if;

  if p_expected_version is not null and v_inv.version is distinct from p_expected_version then
    raise exception 'invoice_version_conflict';
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
      if v_inv.numero is null then
        v_numero := public.allocate_document_number(
          coalesce(v_inv.document_type, 'fattura'),
          v_inv.anno,
          v_inv.series,
          v_inv.company_id
        );
        update public.invoices
        set numero = v_numero, updated_by = v_uid
        where id = p_invoice_id;
        v_inv.numero := v_numero;
      end if;
      v_doc := 'emessa';
      v_pay := coalesce(nullif(v_pay, ''), 'non_pagata');
      v_sdi := case when v_sdi = 'non_applicabile' then 'da_generare' else v_sdi end;
      if v_inv.totale > 0 and not exists (select 1 from public.customer_open_items where invoice_id = p_invoice_id) then
        insert into public.customer_open_items (
          customer_id, source_type, source_id, invoice_id, document_number,
          amount_signed, remaining_signed, due_date, status, opened_at
        )
        values (
          v_inv.customer_id, 'invoice', p_invoice_id, p_invoice_id,
          public.format_document_number(
            coalesce(v_inv.document_type, 'fattura'),
            v_inv.anno,
            v_inv.series,
            v_inv.numero
          ),
          -v_inv.totale, -v_inv.residuo, v_inv.data_scadenza,
          case when v_inv.residuo <= 0 then 'closed' when v_inv.pagato > 0 then 'partial' else 'open' end,
          coalesce(v_inv.data_emissione::timestamptz, now())
        )
        returning id into v_open_id;
      end if;
    when 'mark_sent_to_customer' then
      update public.invoices
      set sent_to_customer_at = coalesce(sent_to_customer_at, now()),
          updated_by = v_uid,
          version = version + 1
      where id = p_invoice_id;
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
      set remaining_signed = 0, status = 'closed', closed_at = now(), updated_at = now()
      where invoice_id = p_invoice_id and status <> 'closed';
    when 'mark_overdue' then
      if v_doc <> 'emessa' then raise exception 'Transizione non consentita'; end if;
      v_pay := 'scaduta';
    else
      raise exception 'Transizione sconosciuta: %', p_transition;
  end case;

  v_prev_event := public.invoice_write_status_axes(
    p_invoice_id, v_doc, v_pay, v_sdi, v_corr, null, true, v_uid, p_transition
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- create_credit_note_from_invoice — NC emessa alla creazione, alloc NC
-- ---------------------------------------------------------------------------
create or replace function public.create_credit_note_from_invoice(
  p_invoice_id uuid,
  p_amount numeric default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_src record;
  v_nc_id uuid;
  v_numero integer;
  v_amount numeric;
  v_corr uuid := gen_random_uuid();
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  select * into v_src from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Fattura non trovata'; end if;
  if v_src.status in ('bozza', 'da_verificare', 'annullata') then
    raise exception 'Stato fattura non valido per nota di credito';
  end if;
  if v_src.numero is null then
    raise exception 'Fattura sorgente senza numerazione; emettere prima la fattura';
  end if;

  v_amount := coalesce(p_amount, v_src.totale);
  if v_amount <= 0 or v_amount > v_src.totale then
    raise exception 'Importo nota di credito non valido';
  end if;

  v_numero := public.allocate_document_number(
    'nota_credito',
    v_src.anno,
    v_src.series,
    v_src.company_id
  );

  insert into public.invoices (
    company_id, numero, anno, series, status, document_type, document_status, payment_status, sdi_status,
    customer_id, cliente_label, customer_snapshot, data_emissione, data_scadenza,
    imponibile, iva, totale, pagato, residuo, note, parent_invoice_id, created_by, updated_by
  )
  values (
    v_src.company_id, v_numero, v_src.anno, v_src.series, 'emessa', 'nota_credito', 'emessa', 'non_pagata', 'da_generare',
    v_src.customer_id, v_src.cliente_label, v_src.customer_snapshot, current_date, null,
    round(v_amount / 1.22, 2), round(v_amount - round(v_amount / 1.22, 2), 2), v_amount, 0, v_amount,
    coalesce(p_reason, 'Nota di credito'), p_invoice_id, v_uid, v_uid
  )
  returning id into v_nc_id;

  insert into public.invoice_relations (source_invoice_id, target_invoice_id, relation_type, meta)
  values (p_invoice_id, v_nc_id, 'credit_note', jsonb_build_object('amount', v_amount));

  insert into public.customer_open_items (
    customer_id, source_type, source_id, invoice_id, document_number,
    amount_signed, remaining_signed, status
  )
  values (
    v_src.customer_id, 'credit_note', v_nc_id, v_nc_id,
    public.format_document_number('nota_credito', v_src.anno, v_src.series, v_numero),
    v_amount, v_amount, 'open'
  );

  perform public.invoice_insert_event(
    'invoice', v_nc_id, 'invoice', v_nc_id, v_nc_id,
    'document', 'credit_note_created', v_corr, null,
    jsonb_build_object('source_invoice_id', p_invoice_id, 'amount', v_amount),
    v_uid
  );

  return v_nc_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- confirm_ddt — central allocator
-- ---------------------------------------------------------------------------
create or replace function public.confirm_ddt(p_ddt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_doc public.ddt_documents%rowtype;
  v_numero integer;
  v_company uuid := coalesce(public.rbac_user_company_id(), '00000000-0000-4000-8000-000000000001'::uuid);
begin
  if not public.rbac_module_can('ddt', 'write') then
    raise exception 'Permesso negato';
  end if;

  select * into v_doc from public.ddt_documents where id = p_ddt_id for update;
  if not found then
    raise exception 'DDT non trovato';
  end if;
  if v_doc.status = 'annullato' then
    raise exception 'DDT annullato';
  end if;
  if v_doc.status <> 'bozza' and v_doc.numero is not null then
    return;
  end if;

  perform public.assert_ddt_preventivo_row_allocations(p_ddt_id);

  v_numero := public.allocate_document_number(
    'ddt',
    v_doc.anno,
    v_doc.serie,
    v_company
  );

  update public.ddt_documents
  set numero = v_numero,
      serie = public.normalize_document_series(v_doc.serie),
      status = 'confermato',
      updated_by = v_uid
  where id = p_ddt_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_ddt_with_rows — normalize series on insert
-- ---------------------------------------------------------------------------
create or replace function public.create_ddt_with_rows(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_ddt_id uuid;
  v_anno integer;
  v_serie text;
  v_status text;
  v_confirm boolean;
  v_row jsonb;
  v_ordine integer := 0;
  v_link jsonb;
begin
  if not public.rbac_module_can('ddt', 'write') then
    raise exception 'Permesso negato';
  end if;

  if nullif(trim(p_payload->>'cliente_label'), '') is null then
    raise exception 'Cliente obbligatorio';
  end if;

  v_status := coalesce(nullif(p_payload->>'status', ''), 'bozza');
  if v_status not in ('bozza', 'confermato') then
    raise exception 'Stato DDT iniziale non valido';
  end if;

  v_anno := coalesce((p_payload->>'anno')::integer, extract(year from coalesce(nullif(p_payload->>'data_documento', '')::date, current_date))::integer);
  v_serie := public.normalize_document_series(p_payload->>'serie');
  v_confirm := coalesce((p_payload->>'confirm')::boolean, false);

  insert into public.ddt_documents (
    numero, anno, serie, status, data_documento, data_consegna,
    cliente_label, customer_snapshot, luogo_consegna,
    preventivo_id, lavorazione_id, mezzo_id, mezzo_snapshot,
    target_type, attrezzatura_id, attrezzatura_snapshot,
    causale_trasporto, vettore, note, origine,
    created_by, updated_by
  )
  values (
    null,
    v_anno,
    v_serie,
    'bozza',
    coalesce(nullif(p_payload->>'data_documento', '')::date, current_date),
    nullif(p_payload->>'data_consegna', '')::date,
    trim(p_payload->>'cliente_label'),
    coalesce(p_payload->'customer_snapshot', '{}'::jsonb),
    coalesce(p_payload->'luogo_consegna', '{}'::jsonb),
    nullif(p_payload->>'preventivo_id', '')::uuid,
    nullif(p_payload->>'lavorazione_id', '')::uuid,
    nullif(p_payload->>'mezzo_id', '')::uuid,
    coalesce(p_payload->'mezzo_snapshot', '{}'::jsonb),
    nullif(p_payload->>'target_type', ''),
    nullif(p_payload->>'attrezzatura_id', '')::uuid,
    coalesce(p_payload->'attrezzatura_snapshot', '{}'::jsonb),
    nullif(p_payload->>'causale_trasporto', ''),
    nullif(p_payload->>'vettore', ''),
    nullif(p_payload->>'note', ''),
    coalesce(nullif(p_payload->>'origine', ''), 'preventivo'),
    v_uid,
    v_uid
  )
  returning id into v_ddt_id;

  for v_row in select * from jsonb_array_elements(coalesce(p_payload->'rows', '[]'::jsonb))
  loop
    v_ordine := v_ordine + 1;
    insert into public.ddt_rows (
      ddt_id, ordine, source_type, source_ref, preventivo_id,
      descrizione, codice, quantita, unita_misura, note, meta
    )
    values (
      v_ddt_id,
      coalesce((v_row->>'ordine')::integer, v_ordine),
      coalesce(nullif(v_row->>'source_type', ''), 'preventivo_output'),
      coalesce(nullif(trim(v_row->>'source_ref'), ''), 'row-' || v_ordine::text),
      nullif(v_row->>'preventivo_id', '')::uuid,
      coalesce(nullif(trim(v_row->>'descrizione'), ''), 'Articolo'),
      nullif(v_row->>'codice', ''),
      greatest(coalesce((v_row->>'quantita')::numeric, 1), 0.001),
      coalesce(nullif(v_row->>'unita_misura', ''), 'pz'),
      nullif(v_row->>'note', ''),
      coalesce(v_row->'meta', '{}'::jsonb)
    );
  end loop;

  if not exists (select 1 from public.ddt_rows where ddt_id = v_ddt_id) then
    raise exception 'Il DDT deve contenere almeno una riga';
  end if;

  for v_link in select * from jsonb_array_elements(coalesce(p_payload->'links', '[]'::jsonb))
  loop
    insert into public.ddt_links (ddt_id, source_type, source_id, meta)
    values (
      v_ddt_id,
      coalesce(nullif(v_link->>'source_type', ''), 'preventivo'),
      (v_link->>'source_id')::uuid,
      coalesce(v_link->'meta', '{}'::jsonb)
    );
  end loop;

  perform public.assert_ddt_preventivo_row_allocations(v_ddt_id);

  if v_confirm or v_status = 'confermato' then
    perform public.confirm_ddt(v_ddt_id);
  end if;

  return v_ddt_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Drop legacy numbering
-- ---------------------------------------------------------------------------
drop policy if exists cap_invoice_number_sequences_write on public.invoice_number_sequences;
drop table if exists public.invoice_number_sequences;

drop function if exists public.allocate_invoice_number(text, text, integer);
drop function if exists public.assign_ddt_numero(integer, text);

drop table if exists public.ddt_numero_counters;

-- ---------------------------------------------------------------------------
-- Notifications: display format SSOT
-- ---------------------------------------------------------------------------
create or replace function public.trg_invoices_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero text;
begin
  v_numero := case
    when new.numero is null then 'Bozza'
    else public.format_document_number(
      coalesce(new.document_type, 'fattura'),
      new.anno,
      new.series,
      new.numero
    )
  end;

  if old.status is distinct from new.status then
    if new.status in ('emessa', 'inviata')
       and old.status not in ('emessa', 'inviata') then
      perform public.cab_enqueue_notification_outbox(
        'fatturazione.invoice_issued',
        'invoices',
        new.id,
        'fatturazione.invoice_issued:invoices:' || new.id::text,
        coalesce(new.updated_by, new.created_by),
        jsonb_build_object('numero', v_numero, 'cliente', new.cliente_label),
        null
      );
    elsif new.status = 'pagata' and old.status is distinct from 'pagata' then
      perform public.cab_enqueue_notification_outbox(
        'fatturazione.invoice_paid',
        'invoices',
        new.id,
        'fatturazione.invoice_paid:invoices:' || new.id::text,
        coalesce(new.updated_by, new.created_by),
        jsonb_build_object('numero', v_numero, 'cliente', new.cliente_label),
        null
      );
    elsif new.status = 'scaduta' and old.status is distinct from 'scaduta' then
      perform public.cab_enqueue_notification_outbox(
        'fatturazione.invoice_overdue',
        'invoices',
        new.id,
        'fatturazione.invoice_overdue:invoices:' || new.id::text,
        coalesce(new.updated_by, new.created_by),
        jsonb_build_object('numero', v_numero, 'cliente', new.cliente_label),
        null
      );
    end if;
  end if;

  return new;
end;
$$;

commit;
