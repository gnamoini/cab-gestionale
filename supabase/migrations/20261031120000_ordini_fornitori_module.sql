-- Modulo ordini ai fornitori — entità, numerazione YY-NNNN/O, righe ricambi, RPC, RLS.

begin;

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Contatore annuo ordini fornitori (formato YY-NNNN/O)
-- ---------------------------------------------------------------------------

create table if not exists public.ordini_fornitori_numero_counters (
  anno smallint primary key,
  last_num integer not null default 0 check (last_num >= 0)
);

comment on table public.ordini_fornitori_numero_counters is
  'Contatore annuale ordini fornitori, formato YY-NNNN/O.';

revoke all on table public.ordini_fornitori_numero_counters from public;
revoke all on table public.ordini_fornitori_numero_counters from anon;
revoke all on table public.ordini_fornitori_numero_counters from authenticated;

-- ---------------------------------------------------------------------------
-- Header ordine
-- ---------------------------------------------------------------------------

create table if not exists public.ordini_fornitori (
  id uuid primary key default gen_random_uuid(),
  numero text,
  status text not null default 'bozza',
  data_ordine date not null default current_date,
  fornitore_label text not null,
  fornitore_snapshot jsonb not null default '{}'::jsonb,
  destinazione text,
  destinazione_snapshot jsonb not null default '{}'::jsonb,
  note text,
  imponibile_righe numeric(14, 2) not null default 0,
  trasporto numeric(14, 2) not null default 0,
  imponibile numeric(14, 2) not null default 0,
  iva_percent numeric(5, 2) not null default 22,
  iva numeric(14, 2) not null default 0,
  totale numeric(14, 2) not null default 0,
  lavorazione_id uuid references public.lavorazioni (id) on delete set null,
  preventivo_id uuid references public.preventivi (id) on delete set null,
  scheda_lavorazione_id uuid,
  pdf_artifact_hash text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ordini_fornitori_status_chk check (
    status in ('bozza', 'inviato', 'confermato', 'annullato')
  ),
  constraint ordini_fornitori_fornitore_label_chk check (char_length(trim(fornitore_label)) > 0),
  constraint ordini_fornitori_imponibile_righe_chk check (imponibile_righe >= 0),
  constraint ordini_fornitori_trasporto_chk check (trasporto >= 0),
  constraint ordini_fornitori_imponibile_chk check (imponibile >= 0),
  constraint ordini_fornitori_iva_percent_chk check (iva_percent >= 0 and iva_percent <= 100),
  constraint ordini_fornitori_iva_chk check (iva >= 0),
  constraint ordini_fornitori_totale_chk check (totale >= 0),
  constraint ordini_fornitori_fornitore_snapshot_obj_chk check (jsonb_typeof(fornitore_snapshot) = 'object'),
  constraint ordini_fornitori_destinazione_snapshot_obj_chk check (jsonb_typeof(destinazione_snapshot) = 'object')
);

drop trigger if exists trg_ordini_fornitori_updated_at on public.ordini_fornitori;
create trigger trg_ordini_fornitori_updated_at
before update on public.ordini_fornitori
for each row execute function public.set_updated_at();

create unique index if not exists idx_ordini_fornitori_numero_uq
  on public.ordini_fornitori (numero)
  where numero is not null and status <> 'annullato';

create index if not exists idx_ordini_fornitori_status on public.ordini_fornitori (status);
create index if not exists idx_ordini_fornitori_data_ordine_desc on public.ordini_fornitori (data_ordine desc);
create index if not exists idx_ordini_fornitori_fornitore_label_trgm on public.ordini_fornitori using gin (fornitore_label gin_trgm_ops);
create index if not exists idx_ordini_fornitori_preventivo_id on public.ordini_fornitori (preventivo_id);
create index if not exists idx_ordini_fornitori_lavorazione_id on public.ordini_fornitori (lavorazione_id);

-- ---------------------------------------------------------------------------
-- Righe ordine
-- ---------------------------------------------------------------------------

create table if not exists public.ordini_fornitori_righe (
  id uuid primary key default gen_random_uuid(),
  ordine_id uuid not null references public.ordini_fornitori (id) on delete cascade,
  ordine integer not null default 0,
  ricambio_id uuid references public.magazzino_ricambi (id) on delete set null,
  codice text,
  descrizione text not null,
  quantita numeric(14, 3) not null,
  prezzo_unitario numeric(14, 2) not null default 0,
  sconto_percent numeric(5, 2) not null default 0,
  totale_riga numeric(14, 2) not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ordini_fornitori_righe_descrizione_chk check (char_length(trim(descrizione)) > 0),
  constraint ordini_fornitori_righe_quantita_chk check (quantita > 0),
  constraint ordini_fornitori_righe_prezzo_chk check (prezzo_unitario >= 0),
  constraint ordini_fornitori_righe_sconto_chk check (sconto_percent >= 0 and sconto_percent <= 100),
  constraint ordini_fornitori_righe_totale_chk check (totale_riga >= 0),
  constraint ordini_fornitori_righe_meta_obj_chk check (jsonb_typeof(meta) = 'object')
);

create index if not exists idx_ordini_fornitori_righe_ordine_id on public.ordini_fornitori_righe (ordine_id);
create index if not exists idx_ordini_fornitori_righe_ricambio_id on public.ordini_fornitori_righe (ricambio_id);

-- ---------------------------------------------------------------------------
-- Links futuri (v1 vuota)
-- ---------------------------------------------------------------------------

create table if not exists public.ordini_fornitori_links (
  id uuid primary key default gen_random_uuid(),
  ordine_id uuid not null references public.ordini_fornitori (id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ordini_fornitori_links_source_type_chk check (
    source_type in ('lavorazione', 'preventivo', 'scheda', 'magazzino')
  ),
  constraint ordini_fornitori_links_meta_obj_chk check (jsonb_typeof(meta) = 'object')
);

create index if not exists idx_ordini_fornitori_links_ordine_id on public.ordini_fornitori_links (ordine_id);
create index if not exists idx_ordini_fornitori_links_source on public.ordini_fornitori_links (source_type, source_id);

-- ---------------------------------------------------------------------------
-- Calcoli totali
-- ---------------------------------------------------------------------------

create or replace function public.ordine_fornitore_row_total(
  p_qty numeric,
  p_prezzo numeric,
  p_sconto numeric
)
returns numeric
language sql
immutable
as $$
  select round(
    greatest(coalesce(p_qty, 0), 0)
    * greatest(coalesce(p_prezzo, 0), 0)
    * (1 - least(100, greatest(coalesce(p_sconto, 0), 0)) / 100.0),
    2
  );
$$;

create or replace function public.ordine_fornitore_compute_totals(
  p_righe jsonb,
  p_trasporto numeric,
  p_iva_percent numeric
)
returns table (
  imponibile_righe numeric,
  imponibile numeric,
  iva numeric,
  totale numeric
)
language plpgsql
immutable
as $$
declare
  v_imponibile_righe numeric := 0;
  v_row jsonb;
  v_trasporto numeric := greatest(coalesce(p_trasporto, 0), 0);
  v_iva_percent numeric := least(100, greatest(coalesce(p_iva_percent, 22), 0));
  v_imponibile numeric;
  v_iva numeric;
begin
  for v_row in select * from jsonb_array_elements(coalesce(p_righe, '[]'::jsonb))
  loop
    v_imponibile_righe := v_imponibile_righe + public.ordine_fornitore_row_total(
      (v_row->>'quantita')::numeric,
      (v_row->>'prezzo_unitario')::numeric,
      coalesce((v_row->>'sconto_percent')::numeric, 0)
    );
  end loop;

  v_imponibile_righe := round(v_imponibile_righe, 2);
  v_imponibile := round(v_imponibile_righe + v_trasporto, 2);
  v_iva := round(v_imponibile * v_iva_percent / 100.0, 2);

  imponibile_righe := v_imponibile_righe;
  imponibile := v_imponibile;
  iva := v_iva;
  totale := round(v_imponibile + v_iva, 2);
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Numerazione YY-NNNN/O
-- ---------------------------------------------------------------------------

create or replace function public.assign_ordine_fornitore_numero(p_data_ordine date default current_date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anno smallint;
  v_num integer;
  v_yy text;
begin
  v_anno := extract(year from timezone('Europe/Rome', coalesce(p_data_ordine, current_date)::timestamptz))::smallint;

  insert into public.ordini_fornitori_numero_counters (anno, last_num)
  values (v_anno, 1)
  on conflict (anno) do update
  set last_num = ordini_fornitori_numero_counters.last_num + 1
  returning last_num into v_num;

  v_yy := lpad((v_anno % 100)::text, 2, '0');
  return v_yy || '-' || lpad(v_num::text, 4, '0') || '/O';
end;
$$;

comment on function public.assign_ordine_fornitore_numero(date) is
  'Assegna numero ordine fornitore annuale (es. 26-0001/O).';

revoke all on function public.assign_ordine_fornitore_numero(date) from public;

create or replace function public.trg_ordini_fornitori_assign_numero()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.numero is null or trim(new.numero) = '' then
    new.numero := public.assign_ordine_fornitore_numero(coalesce(new.data_ordine, current_date));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ordini_fornitori_assign_numero on public.ordini_fornitori;
create trigger trg_ordini_fornitori_assign_numero
before insert on public.ordini_fornitori
for each row
execute function public.trg_ordini_fornitori_assign_numero();

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------

create or replace function public.create_ordine_fornitore_with_righe(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_ordine_id uuid;
  v_row jsonb;
  v_ordine integer := 0;
  v_trasporto numeric;
  v_iva_percent numeric;
  v_tot record;
  v_status text;
  v_row_total numeric;
begin
  if not public.rbac_module_can('ordini_fornitori', 'write') then
    raise exception 'Permesso negato';
  end if;

  if nullif(trim(p_payload->>'fornitore_label'), '') is null then
    raise exception 'Fornitore obbligatorio';
  end if;

  v_status := coalesce(nullif(p_payload->>'status', ''), 'bozza');
  if v_status not in ('bozza', 'inviato', 'confermato') then
    raise exception 'Stato ordine iniziale non valido';
  end if;

  v_trasporto := greatest(coalesce((p_payload->>'trasporto')::numeric, 0), 0);
  v_iva_percent := coalesce((p_payload->>'iva_percent')::numeric, 22);

  select * into v_tot
  from public.ordine_fornitore_compute_totals(
    coalesce(p_payload->'righe', '[]'::jsonb),
    v_trasporto,
    v_iva_percent
  );

  insert into public.ordini_fornitori (
    numero, status, data_ordine,
    fornitore_label, fornitore_snapshot,
    destinazione, destinazione_snapshot,
    note, imponibile_righe, trasporto, imponibile, iva_percent, iva, totale,
    lavorazione_id, preventivo_id, scheda_lavorazione_id,
    created_by, updated_by
  )
  values (
    null,
    v_status,
    coalesce(nullif(p_payload->>'data_ordine', '')::date, current_date),
    trim(p_payload->>'fornitore_label'),
    coalesce(p_payload->'fornitore_snapshot', '{}'::jsonb),
    nullif(p_payload->>'destinazione', ''),
    coalesce(p_payload->'destinazione_snapshot', '{}'::jsonb),
    nullif(p_payload->>'note', ''),
    v_tot.imponibile_righe,
    v_trasporto,
    v_tot.imponibile,
    v_iva_percent,
    v_tot.iva,
    v_tot.totale,
    nullif(p_payload->>'lavorazione_id', '')::uuid,
    nullif(p_payload->>'preventivo_id', '')::uuid,
    nullif(p_payload->>'scheda_lavorazione_id', '')::uuid,
    v_uid,
    v_uid
  )
  returning id into v_ordine_id;

  for v_row in select * from jsonb_array_elements(coalesce(p_payload->'righe', '[]'::jsonb))
  loop
    v_ordine := v_ordine + 1;
    v_row_total := public.ordine_fornitore_row_total(
      (v_row->>'quantita')::numeric,
      (v_row->>'prezzo_unitario')::numeric,
      coalesce((v_row->>'sconto_percent')::numeric, 0)
    );
    insert into public.ordini_fornitori_righe (
      ordine_id, ordine, ricambio_id, codice, descrizione,
      quantita, prezzo_unitario, sconto_percent, totale_riga, meta
    )
    values (
      v_ordine_id,
      coalesce((v_row->>'ordine')::integer, v_ordine),
      nullif(v_row->>'ricambio_id', '')::uuid,
      nullif(v_row->>'codice', ''),
      coalesce(nullif(trim(v_row->>'descrizione'), ''), 'Articolo'),
      greatest(coalesce((v_row->>'quantita')::numeric, 1), 0.001),
      greatest(coalesce((v_row->>'prezzo_unitario')::numeric, 0), 0),
      least(100, greatest(coalesce((v_row->>'sconto_percent')::numeric, 0), 0)),
      v_row_total,
      coalesce(v_row->'meta', '{}'::jsonb)
    );
  end loop;

  if not exists (select 1 from public.ordini_fornitori_righe where ordine_id = v_ordine_id) then
    raise exception 'L''ordine deve contenere almeno una riga';
  end if;

  return v_ordine_id;
end;
$$;

create or replace function public.update_ordine_fornitore_draft(
  p_id uuid,
  p_payload jsonb,
  p_expected_updated_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_doc public.ordini_fornitori%rowtype;
  v_row jsonb;
  v_ordine integer := 0;
  v_trasporto numeric;
  v_iva_percent numeric;
  v_tot record;
  v_righe jsonb;
  v_row_total numeric;
begin
  if not public.rbac_module_can('ordini_fornitori', 'write') then
    raise exception 'Permesso negato';
  end if;

  select * into v_doc from public.ordini_fornitori where id = p_id for update;
  if not found then raise exception 'Ordine non trovato'; end if;
  if v_doc.status = 'annullato' then raise exception 'Ordine annullato'; end if;
  if v_doc.status <> 'bozza' then raise exception 'Solo bozze modificabili'; end if;

  if p_expected_updated_at is not null and v_doc.updated_at <> p_expected_updated_at then
    raise exception 'CONFLICT: record modified';
  end if;

  v_trasporto := case
    when p_payload ? 'trasporto' then greatest(coalesce((p_payload->>'trasporto')::numeric, 0), 0)
    else v_doc.trasporto
  end;
  v_iva_percent := case
    when p_payload ? 'iva_percent' then coalesce((p_payload->>'iva_percent')::numeric, v_doc.iva_percent)
    else v_doc.iva_percent
  end;
  v_righe := case when p_payload ? 'righe' then p_payload->'righe' else null end;

  if v_righe is not null then
    select * into v_tot from public.ordine_fornitore_compute_totals(v_righe, v_trasporto, v_iva_percent);
  elsif p_payload ? 'trasporto' or p_payload ? 'iva_percent' then
    select * into v_tot
    from public.ordine_fornitore_compute_totals(
      (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
       from (
         select quantita, prezzo_unitario, sconto_percent
         from public.ordini_fornitori_righe
         where ordine_id = p_id
         order by ordine
       ) r),
      v_trasporto,
      v_iva_percent
    );
  else
    v_tot.imponibile_righe := v_doc.imponibile_righe;
    v_tot.imponibile := v_doc.imponibile;
    v_tot.iva := v_doc.iva;
    v_tot.totale := v_doc.totale;
  end if;

  update public.ordini_fornitori
  set
    data_ordine = coalesce(nullif(p_payload->>'data_ordine', '')::date, data_ordine),
    status = case
      when p_payload ? 'status' then coalesce(nullif(p_payload->>'status', ''), status)
      else status
    end,
    fornitore_label = coalesce(nullif(trim(p_payload->>'fornitore_label'), ''), fornitore_label),
    fornitore_snapshot = coalesce(p_payload->'fornitore_snapshot', fornitore_snapshot),
    destinazione = case when p_payload ? 'destinazione' then nullif(p_payload->>'destinazione', '') else destinazione end,
    destinazione_snapshot = coalesce(p_payload->'destinazione_snapshot', destinazione_snapshot),
    note = case when p_payload ? 'note' then nullif(p_payload->>'note', '') else note end,
    imponibile_righe = v_tot.imponibile_righe,
    trasporto = v_trasporto,
    imponibile = v_tot.imponibile,
    iva_percent = v_iva_percent,
    iva = v_tot.iva,
    totale = v_tot.totale,
    updated_by = v_uid
  where id = p_id;

  if v_righe is not null then
    delete from public.ordini_fornitori_righe where ordine_id = p_id;
    for v_row in select * from jsonb_array_elements(v_righe)
    loop
      v_ordine := v_ordine + 1;
      v_row_total := public.ordine_fornitore_row_total(
        (v_row->>'quantita')::numeric,
        (v_row->>'prezzo_unitario')::numeric,
        coalesce((v_row->>'sconto_percent')::numeric, 0)
      );
      insert into public.ordini_fornitori_righe (
        ordine_id, ordine, ricambio_id, codice, descrizione,
        quantita, prezzo_unitario, sconto_percent, totale_riga, meta
      )
      values (
        p_id,
        coalesce((v_row->>'ordine')::integer, v_ordine),
        nullif(v_row->>'ricambio_id', '')::uuid,
        nullif(v_row->>'codice', ''),
        coalesce(nullif(trim(v_row->>'descrizione'), ''), 'Articolo'),
        greatest(coalesce((v_row->>'quantita')::numeric, 1), 0.001),
        greatest(coalesce((v_row->>'prezzo_unitario')::numeric, 0), 0),
        least(100, greatest(coalesce((v_row->>'sconto_percent')::numeric, 0), 0)),
        v_row_total,
        coalesce(v_row->'meta', '{}'::jsonb)
      );
    end loop;
    if not exists (select 1 from public.ordini_fornitori_righe where ordine_id = p_id) then
      raise exception 'L''ordine deve contenere almeno una riga';
    end if;
  end if;
end;
$$;

create or replace function public.annulla_ordine_fornitore(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
begin
  if not public.rbac_module_can('ordini_fornitori', 'write') then
    raise exception 'Permesso negato';
  end if;

  update public.ordini_fornitori
  set status = 'annullato',
      updated_by = v_uid
  where id = p_id and status <> 'annullato';
end;
$$;

revoke all on function public.create_ordine_fornitore_with_righe(jsonb) from public;
revoke all on function public.update_ordine_fornitore_draft(uuid, jsonb, timestamptz) from public;
revoke all on function public.annulla_ordine_fornitore(uuid) from public;
grant execute on function public.create_ordine_fornitore_with_righe(jsonb) to authenticated;
grant execute on function public.update_ordine_fornitore_draft(uuid, jsonb, timestamptz) to authenticated;
grant execute on function public.annulla_ordine_fornitore(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RBAC mapping + role defaults
-- ---------------------------------------------------------------------------

create or replace function public.rbac_is_valid_erp_module(p_module text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_module, '') in (
    'magazzino', 'preventivi', 'lavorazioni', 'mezzi', 'report',
    'documenti', 'dipendenti', 'fatturazione', 'ddt', 'ordini_fornitori'
  );
$$;

create or replace function public.rbac_role_module_default(p_role text, p_module text, p_op text)
returns boolean
language plpgsql
immutable
as $$
begin
  if not public.rbac_is_valid_erp_module(p_module) then
    return false;
  end if;

  if p_role = 'admin' then
    return true;
  end if;

  if p_role = 'cliente' then
    return false;
  end if;

  if p_role = 'guest' then
    return p_op = 'read';
  end if;

  if p_role = 'operatore' then
    if p_module in ('magazzino', 'lavorazioni', 'mezzi', 'documenti') then
      return p_op in ('read', 'write');
    end if;
    return false;
  end if;

  if p_role = 'addetto_amministrativo' then
    if p_module in ('preventivi', 'fatturazione', 'ddt', 'ordini_fornitori', 'report') then
      return p_op in ('read', 'write');
    end if;
    return false;
  end if;

  if p_role = 'manager' then
    return p_op in ('read', 'write');
  end if;

  return false;
end;
$$;

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
    when 'ordini_fornitori' then 'ordini_fornitori'
    when 'ordini_fornitori_righe' then 'ordini_fornitori'
    when 'ordini_fornitori_links' then 'ordini_fornitori'
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
    when 'ordini_fornitori' then 'ordini_fornitori'
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
    or public.user_effective_can('ddt', 'read')
    or public.user_effective_can('ordini_fornitori', 'read');
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.ordini_fornitori enable row level security;
alter table public.ordini_fornitori_righe enable row level security;
alter table public.ordini_fornitori_links enable row level security;

drop policy if exists cap_ordini_fornitori_select on public.ordini_fornitori;
create policy cap_ordini_fornitori_select on public.ordini_fornitori for select to authenticated
using (public.rbac_module_can('ordini_fornitori', 'read'));

drop policy if exists cap_ordini_fornitori_insert on public.ordini_fornitori;
create policy cap_ordini_fornitori_insert on public.ordini_fornitori for insert to authenticated
with check (public.rbac_module_can('ordini_fornitori', 'write'));

drop policy if exists cap_ordini_fornitori_update on public.ordini_fornitori;
create policy cap_ordini_fornitori_update on public.ordini_fornitori for update to authenticated
using (public.rbac_module_can('ordini_fornitori', 'write'))
with check (public.rbac_module_can('ordini_fornitori', 'write'));

drop policy if exists cap_ordini_fornitori_delete on public.ordini_fornitori;
create policy cap_ordini_fornitori_delete on public.ordini_fornitori for delete to authenticated
using (public.rbac_module_can('ordini_fornitori', 'admin') and status = 'bozza');

drop policy if exists cap_ordini_fornitori_righe_select on public.ordini_fornitori_righe;
create policy cap_ordini_fornitori_righe_select on public.ordini_fornitori_righe for select to authenticated
using (public.rbac_module_can('ordini_fornitori', 'read'));

drop policy if exists cap_ordini_fornitori_righe_insert on public.ordini_fornitori_righe;
create policy cap_ordini_fornitori_righe_insert on public.ordini_fornitori_righe for insert to authenticated
with check (public.rbac_module_can('ordini_fornitori', 'write'));

drop policy if exists cap_ordini_fornitori_righe_update on public.ordini_fornitori_righe;
create policy cap_ordini_fornitori_righe_update on public.ordini_fornitori_righe for update to authenticated
using (public.rbac_module_can('ordini_fornitori', 'write'))
with check (public.rbac_module_can('ordini_fornitori', 'write'));

drop policy if exists cap_ordini_fornitori_righe_delete on public.ordini_fornitori_righe;
create policy cap_ordini_fornitori_righe_delete on public.ordini_fornitori_righe for delete to authenticated
using (public.rbac_module_can('ordini_fornitori', 'write'));

drop policy if exists cap_ordini_fornitori_links_select on public.ordini_fornitori_links;
create policy cap_ordini_fornitori_links_select on public.ordini_fornitori_links for select to authenticated
using (public.rbac_module_can('ordini_fornitori', 'read'));

drop policy if exists cap_ordini_fornitori_links_insert on public.ordini_fornitori_links;
create policy cap_ordini_fornitori_links_insert on public.ordini_fornitori_links for insert to authenticated
with check (public.rbac_module_can('ordini_fornitori', 'write'));

drop policy if exists cap_ordini_fornitori_links_update on public.ordini_fornitori_links;
create policy cap_ordini_fornitori_links_update on public.ordini_fornitori_links for update to authenticated
using (public.rbac_module_can('ordini_fornitori', 'write'))
with check (public.rbac_module_can('ordini_fornitori', 'write'));

drop policy if exists cap_ordini_fornitori_links_delete on public.ordini_fornitori_links;
create policy cap_ordini_fornitori_links_delete on public.ordini_fornitori_links for delete to authenticated
using (public.rbac_module_can('ordini_fornitori', 'write'));

commit;
