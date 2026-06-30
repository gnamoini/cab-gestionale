-- Modulo DDT (Documenti di Trasporto) — entità, numerazione, consegne parziali da preventivo.

create extension if not exists pg_trgm;

create table if not exists public.ddt_numero_counters (
  anno integer not null,
  serie text not null default 'default',
  last_num integer not null default 0,
  primary key (anno, serie),
  constraint ddt_numero_counters_anno_chk check (anno between 2000 and 2100)
);

create table if not exists public.ddt_documents (
  id uuid primary key default gen_random_uuid(),
  numero integer,
  anno integer not null,
  serie text not null default 'default',
  sede_id uuid,
  status text not null default 'bozza',
  data_documento date not null default current_date,
  data_consegna date,
  cliente_label text not null,
  customer_snapshot jsonb not null default '{}'::jsonb,
  luogo_consegna jsonb not null default '{}'::jsonb,
  preventivo_id uuid references public.preventivi (id) on delete set null,
  lavorazione_id uuid references public.lavorazioni (id) on delete set null,
  mezzo_id uuid references public.mezzi (id) on delete set null,
  mezzo_snapshot jsonb not null default '{}'::jsonb,
  causale_trasporto text,
  vettore text,
  note text,
  origine text not null default 'preventivo',
  pdf_artifact_hash text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  annullato_at timestamptz,
  stampato_at timestamptz,
  consegnato_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ddt_documents_status_chk check (
    status in ('bozza', 'confermato', 'stampato', 'consegnato', 'annullato')
  ),
  constraint ddt_documents_origine_chk check (
    origine in ('preventivo', 'manuale', 'lavorazione', 'ordine', 'fattura')
  ),
  constraint ddt_documents_cliente_label_chk check (char_length(trim(cliente_label)) > 0),
  constraint ddt_documents_anno_chk check (anno between 2000 and 2100),
  constraint ddt_documents_numero_chk check (numero is null or numero > 0),
  constraint ddt_documents_customer_snapshot_obj_chk check (jsonb_typeof(customer_snapshot) = 'object'),
  constraint ddt_documents_luogo_consegna_obj_chk check (jsonb_typeof(luogo_consegna) = 'object'),
  constraint ddt_documents_mezzo_snapshot_obj_chk check (jsonb_typeof(mezzo_snapshot) = 'object')
);

drop trigger if exists trg_ddt_documents_updated_at on public.ddt_documents;
create trigger trg_ddt_documents_updated_at
before update on public.ddt_documents
for each row execute function public.set_updated_at();

create unique index if not exists idx_ddt_documents_anno_serie_numero_uq
  on public.ddt_documents (anno, serie, numero)
  where numero is not null and status <> 'annullato';

create index if not exists idx_ddt_documents_status on public.ddt_documents (status);
create index if not exists idx_ddt_documents_data_documento_desc on public.ddt_documents (data_documento desc);
create index if not exists idx_ddt_documents_preventivo_id on public.ddt_documents (preventivo_id);
create index if not exists idx_ddt_documents_lavorazione_id on public.ddt_documents (lavorazione_id);
create index if not exists idx_ddt_documents_mezzo_id on public.ddt_documents (mezzo_id);
create index if not exists idx_ddt_documents_cliente_label_trgm on public.ddt_documents using gin (cliente_label gin_trgm_ops);

create table if not exists public.ddt_rows (
  id uuid primary key default gen_random_uuid(),
  ddt_id uuid not null references public.ddt_documents (id) on delete cascade,
  ordine integer not null default 0,
  source_type text not null default 'preventivo_output',
  source_ref text not null,
  preventivo_id uuid references public.preventivi (id) on delete set null,
  descrizione text not null,
  codice text,
  quantita numeric(14, 3) not null,
  unita_misura text not null default 'pz',
  note text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ddt_rows_source_type_chk check (
    source_type in ('preventivo_riga', 'preventivo_output', 'libera')
  ),
  constraint ddt_rows_descrizione_chk check (char_length(trim(descrizione)) > 0),
  constraint ddt_rows_quantita_chk check (quantita > 0),
  constraint ddt_rows_meta_obj_chk check (jsonb_typeof(meta) = 'object')
);

create index if not exists idx_ddt_rows_ddt_id on public.ddt_rows (ddt_id);
create index if not exists idx_ddt_rows_preventivo_source on public.ddt_rows (preventivo_id, source_ref);

create table if not exists public.ddt_links (
  id uuid primary key default gen_random_uuid(),
  ddt_id uuid not null references public.ddt_documents (id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ddt_links_source_type_chk check (
    source_type in ('preventivo', 'lavorazione', 'ordine', 'fattura', 'mezzo')
  ),
  constraint ddt_links_meta_obj_chk check (jsonb_typeof(meta) = 'object')
);

create index if not exists idx_ddt_links_ddt_id on public.ddt_links (ddt_id);
create index if not exists idx_ddt_links_source on public.ddt_links (source_type, source_id);

-- Quantità già consegnata per riga preventivo (DDT non annullati).
create or replace function public.ddt_preventivo_row_delivered_qty(
  p_preventivo_id uuid,
  p_source_ref text,
  p_exclude_ddt_id uuid default null
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(r.quantita), 0)::numeric
  from public.ddt_rows r
  join public.ddt_documents d on d.id = r.ddt_id
  where r.preventivo_id = p_preventivo_id
    and r.source_ref = p_source_ref
    and d.status <> 'annullato'
    and (p_exclude_ddt_id is null or d.id <> p_exclude_ddt_id);
$$;

create or replace function public.assert_ddt_preventivo_row_allocations(p_ddt_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r record;
  v_delivered numeric;
  v_ordered numeric;
begin
  for r in
    select preventivo_id, source_ref,
           sum(quantita)::numeric as qty_this_ddt,
           max((meta->>'qty_ordered')::numeric) as qty_ordered
    from public.ddt_rows
    where ddt_id = p_ddt_id and preventivo_id is not null
    group by preventivo_id, source_ref
  loop
    v_ordered := coalesce(r.qty_ordered, 0);
    if v_ordered <= 0 then
      raise exception 'qty_ordered mancante per riga preventivo %', r.source_ref;
    end if;
    v_delivered := public.ddt_preventivo_row_delivered_qty(r.preventivo_id, r.source_ref, p_ddt_id)
      + r.qty_this_ddt;
    if round(v_delivered, 3) > round(v_ordered, 3) then
      raise exception 'Quantità DDT superiore al residuo preventivo per riga %', r.source_ref;
    end if;
  end loop;
end;
$$;

create or replace view public.preventivo_ddt_fulfillment as
select
  r.preventivo_id,
  r.source_ref,
  max((r.meta->>'qty_ordered')::numeric) as qty_preventivo,
  coalesce(sum(r.quantita) filter (where d.status <> 'annullato'), 0)::numeric as qty_consegnata,
  greatest(
    coalesce(max((r.meta->>'qty_ordered')::numeric), 0)
    - coalesce(sum(r.quantita) filter (where d.status <> 'annullato'), 0),
    0
  )::numeric as qty_residua
from public.ddt_rows r
join public.ddt_documents d on d.id = r.ddt_id
where r.preventivo_id is not null
group by r.preventivo_id, r.source_ref;

create or replace function public.assign_ddt_numero(p_anno integer, p_serie text default 'default')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_num integer;
begin
  perform pg_advisory_xact_lock(hashtext('ddt:' || p_anno::text || ':' || coalesce(p_serie, 'default')));

  insert into public.ddt_numero_counters (anno, serie, last_num)
  values (p_anno, coalesce(nullif(trim(p_serie), ''), 'default'), 0)
  on conflict (anno, serie) do nothing;

  update public.ddt_numero_counters
  set last_num = last_num + 1
  where anno = p_anno and serie = coalesce(nullif(trim(p_serie), ''), 'default')
  returning last_num into v_num;

  return v_num;
end;
$$;

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
  v_numero integer;
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
  v_serie := coalesce(nullif(trim(p_payload->>'serie'), ''), 'default');
  v_confirm := coalesce((p_payload->>'confirm')::boolean, false);

  insert into public.ddt_documents (
    numero, anno, serie, status, data_documento, data_consegna,
    cliente_label, customer_snapshot, luogo_consegna,
    preventivo_id, lavorazione_id, mezzo_id, mezzo_snapshot,
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

  v_numero := public.assign_ddt_numero(v_doc.anno, v_doc.serie);

  update public.ddt_documents
  set numero = v_numero,
      status = 'confermato',
      updated_by = v_uid
  where id = p_ddt_id;
end;
$$;

create or replace function public.update_ddt_draft(p_ddt_id uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_doc public.ddt_documents%rowtype;
  v_row jsonb;
  v_ordine integer := 0;
begin
  if not public.rbac_module_can('ddt', 'write') then
    raise exception 'Permesso negato';
  end if;

  select * into v_doc from public.ddt_documents where id = p_ddt_id for update;
  if not found then raise exception 'DDT non trovato'; end if;
  if v_doc.status <> 'bozza' then raise exception 'Solo bozze modificabili'; end if;

  update public.ddt_documents
  set
    data_documento = coalesce(nullif(p_payload->>'data_documento', '')::date, data_documento),
    data_consegna = case when p_payload ? 'data_consegna' then nullif(p_payload->>'data_consegna', '')::date else data_consegna end,
    cliente_label = coalesce(nullif(trim(p_payload->>'cliente_label'), ''), cliente_label),
    customer_snapshot = coalesce(p_payload->'customer_snapshot', customer_snapshot),
    luogo_consegna = coalesce(p_payload->'luogo_consegna', luogo_consegna),
    mezzo_snapshot = coalesce(p_payload->'mezzo_snapshot', mezzo_snapshot),
    causale_trasporto = case when p_payload ? 'causale_trasporto' then nullif(p_payload->>'causale_trasporto', '') else causale_trasporto end,
    vettore = case when p_payload ? 'vettore' then nullif(p_payload->>'vettore', '') else vettore end,
    note = case when p_payload ? 'note' then nullif(p_payload->>'note', '') else note end,
    updated_by = v_uid
  where id = p_ddt_id;

  if p_payload ? 'rows' then
    delete from public.ddt_rows where ddt_id = p_ddt_id;
    for v_row in select * from jsonb_array_elements(p_payload->'rows')
    loop
      v_ordine := v_ordine + 1;
      insert into public.ddt_rows (
        ddt_id, ordine, source_type, source_ref, preventivo_id,
        descrizione, codice, quantita, unita_misura, note, meta
      )
      values (
        p_ddt_id,
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
    perform public.assert_ddt_preventivo_row_allocations(p_ddt_id);
  end if;
end;
$$;

create or replace function public.cancel_ddt(p_ddt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
begin
  if not public.rbac_module_can('ddt', 'admin') and not public.rbac_module_can('ddt', 'write') then
    raise exception 'Permesso negato';
  end if;

  update public.ddt_documents
  set status = 'annullato',
      annullato_at = now(),
      updated_by = v_uid
  where id = p_ddt_id and status <> 'annullato';
end;
$$;

create or replace function public.mark_ddt_stampato(p_ddt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
begin
  if not public.rbac_module_can('ddt', 'read') then
    raise exception 'Permesso negato';
  end if;

  update public.ddt_documents
  set status = case when status = 'confermato' then 'stampato' else status end,
      stampato_at = coalesce(stampato_at, now()),
      updated_by = v_uid
  where id = p_ddt_id and status in ('confermato', 'stampato', 'consegnato');
end;
$$;

create or replace function public.mark_ddt_consegnato(p_ddt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
begin
  if not public.rbac_module_can('ddt', 'write') then
    raise exception 'Permesso negato';
  end if;

  update public.ddt_documents
  set status = 'consegnato',
      consegnato_at = coalesce(consegnato_at, now()),
      updated_by = v_uid
  where id = p_ddt_id and status <> 'annullato' and status <> 'bozza';
end;
$$;

-- RBAC mapping esteso
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
    when 'ddt_documents' then 'ddt'
    when 'ddt_rows' then 'ddt'
    when 'ddt_links' then 'ddt'
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
    when 'ddt_documents' then 'ddt'
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
    or public.user_effective_can('fatturazione', 'read')
    or public.user_effective_can('ddt', 'read');
$$;

alter table public.ddt_documents enable row level security;
alter table public.ddt_rows enable row level security;
alter table public.ddt_links enable row level security;

drop policy if exists cap_ddt_documents_select on public.ddt_documents;
create policy cap_ddt_documents_select on public.ddt_documents for select to authenticated
using (public.rbac_module_can('ddt', 'read'));

drop policy if exists cap_ddt_documents_insert on public.ddt_documents;
create policy cap_ddt_documents_insert on public.ddt_documents for insert to authenticated
with check (public.rbac_module_can('ddt', 'write'));

drop policy if exists cap_ddt_documents_update on public.ddt_documents;
create policy cap_ddt_documents_update on public.ddt_documents for update to authenticated
using (public.rbac_module_can('ddt', 'write'))
with check (public.rbac_module_can('ddt', 'write'));

drop policy if exists cap_ddt_documents_delete on public.ddt_documents;
create policy cap_ddt_documents_delete on public.ddt_documents for delete to authenticated
using (public.rbac_module_can('ddt', 'admin') and status = 'bozza');

drop policy if exists cap_ddt_rows_select on public.ddt_rows;
create policy cap_ddt_rows_select on public.ddt_rows for select to authenticated
using (public.rbac_module_can('ddt', 'read'));

drop policy if exists cap_ddt_rows_insert on public.ddt_rows;
create policy cap_ddt_rows_insert on public.ddt_rows for insert to authenticated
with check (public.rbac_module_can('ddt', 'write'));

drop policy if exists cap_ddt_rows_update on public.ddt_rows;
create policy cap_ddt_rows_update on public.ddt_rows for update to authenticated
using (public.rbac_module_can('ddt', 'write'))
with check (public.rbac_module_can('ddt', 'write'));

drop policy if exists cap_ddt_rows_delete on public.ddt_rows;
create policy cap_ddt_rows_delete on public.ddt_rows for delete to authenticated
using (public.rbac_module_can('ddt', 'write'));

drop policy if exists cap_ddt_links_select on public.ddt_links;
create policy cap_ddt_links_select on public.ddt_links for select to authenticated
using (public.rbac_module_can('ddt', 'read'));

drop policy if exists cap_ddt_links_insert on public.ddt_links;
create policy cap_ddt_links_insert on public.ddt_links for insert to authenticated
with check (public.rbac_module_can('ddt', 'write'));

drop policy if exists cap_ddt_links_update on public.ddt_links;
create policy cap_ddt_links_update on public.ddt_links for update to authenticated
using (public.rbac_module_can('ddt', 'write'))
with check (public.rbac_module_can('ddt', 'write'));

drop policy if exists cap_ddt_links_delete on public.ddt_links;
create policy cap_ddt_links_delete on public.ddt_links for delete to authenticated
using (public.rbac_module_can('ddt', 'write'));

grant select on public.preventivo_ddt_fulfillment to authenticated;
