-- Ordini fornitori: stati in_consegna/consegnato, ricezione parziale, link movimenti stock

begin;

-- ---------------------------------------------------------------------------
-- Migrazione stati legacy
-- ---------------------------------------------------------------------------

update public.ordini_fornitori set status = 'inviato' where status = 'confermato';
update public.ordini_fornitori set status = 'in_consegna' where status = 'spedito';
update public.ordini_fornitori set status = 'consegnato' where status = 'ricevuto';

alter table public.ordini_fornitori drop constraint if exists ordini_fornitori_status_chk;
alter table public.ordini_fornitori
  add constraint ordini_fornitori_status_chk check (
    status in ('bozza', 'inviato', 'in_consegna', 'consegnato', 'annullato')
  );

alter table public.ordini_fornitori
  add column if not exists data_consegna date;

comment on column public.ordini_fornitori.data_consegna is
  'Data chiusura ordine (tutte le righe ricevute).';

-- Backfill data_consegna per ordini già consegnati
update public.ordini_fornitori
set data_consegna = coalesce(data_consegna, data_ordine)
where status = 'consegnato' and data_consegna is null;

-- ---------------------------------------------------------------------------
-- Righe: quantità ricevuta (SSOT audit ricezione)
-- ---------------------------------------------------------------------------

alter table public.ordini_fornitori_righe
  add column if not exists quantita_ricevuta numeric(14, 3) not null default 0;

alter table public.ordini_fornitori_righe drop constraint if exists ordini_fornitori_righe_quantita_ricevuta_chk;
alter table public.ordini_fornitori_righe
  add constraint ordini_fornitori_righe_quantita_ricevuta_chk check (
    quantita_ricevuta >= 0 and quantita_ricevuta <= quantita
  );

-- Righe ordini consegnati: ricevuta = ordinata
update public.ordini_fornitori_righe r
set quantita_ricevuta = r.quantita
from public.ordini_fornitori o
where o.id = r.ordine_id
  and o.status = 'consegnato'
  and r.quantita_ricevuta = 0;

create index if not exists idx_ordini_fornitori_righe_ricambio_in_consegna
  on public.ordini_fornitori_righe (ricambio_id)
  where ricambio_id is not null;

-- ---------------------------------------------------------------------------
-- Movimenti stock: riferimento ordine fornitore
-- ---------------------------------------------------------------------------

alter table public.movimenti_ricambi
  add column if not exists ordine_fornitore_id uuid references public.ordini_fornitori (id) on delete set null,
  add column if not exists ordine_fornitore_riga_id uuid references public.ordini_fornitori_righe (id) on delete set null,
  add column if not exists delivery_batch_id text;

create unique index if not exists idx_movimenti_ricambi_ordine_riga_batch_uq
  on public.movimenti_ricambi (ordine_fornitore_riga_id, delivery_batch_id)
  where ordine_fornitore_riga_id is not null and delivery_batch_id is not null;

-- ---------------------------------------------------------------------------
-- stock_apply_movement: origine ordine_fornitore + refs ordine
-- ---------------------------------------------------------------------------

create or replace function public.stock_apply_movement(
  p_ricambio_id uuid,
  p_delta numeric,
  p_expected_version bigint,
  p_operation_id uuid,
  p_origine text default 'manual_adjustment',
  p_causale text default null,
  p_conta_statistiche boolean default true,
  p_lavorazione_id uuid default null,
  p_meta jsonb default '{}'::jsonb,
  p_ordine_fornitore_id uuid default null,
  p_ordine_fornitore_riga_id uuid default null,
  p_delivery_batch_id text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.magazzino_ricambi%rowtype;
  v_existing public.movimenti_ricambi%rowtype;
  v_tipo public.tipo_movimento_ricambio;
  v_abs_qty numeric(14, 3);
  v_new_q numeric(14, 3);
  v_mov_id uuid;
  v_causale text;
begin
  if p_operation_id is null then
    raise exception 'operation_id_required' using errcode = '22023';
  end if;

  select * into v_existing
  from public.movimenti_ricambi
  where operation_id = p_operation_id
  limit 1;

  if found then
    select * into v_row from public.magazzino_ricambi where id = v_existing.ricambio_id;
    return jsonb_build_object(
      'ricambio_id', v_row.id,
      'quantita', v_row.quantita,
      'stock_version', v_row.stock_version,
      'movimento_id', v_existing.id,
      'operation_id', p_operation_id,
      'idempotent', true
    );
  end if;

  if p_ordine_fornitore_riga_id is not null and p_delivery_batch_id is not null then
    select * into v_existing
    from public.movimenti_ricambi
    where ordine_fornitore_riga_id = p_ordine_fornitore_riga_id
      and delivery_batch_id = p_delivery_batch_id
    limit 1;

    if found then
      select * into v_row from public.magazzino_ricambi where id = v_existing.ricambio_id;
      return jsonb_build_object(
        'ricambio_id', v_row.id,
        'quantita', v_row.quantita,
        'stock_version', v_row.stock_version,
        'movimento_id', v_existing.id,
        'operation_id', v_existing.operation_id,
        'idempotent', true
      );
    end if;
  end if;

  if p_delta = 0 then
    select * into v_row from public.magazzino_ricambi where id = p_ricambio_id for update;
    if not found then
      raise exception 'ricambio_not_found' using errcode = 'P0002';
    end if;
    if v_row.stock_version is distinct from p_expected_version then
      raise exception 'stock_version_conflict' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'ricambio_id', v_row.id,
      'quantita', v_row.quantita,
      'stock_version', v_row.stock_version,
      'movimento_id', null,
      'operation_id', p_operation_id,
      'noop', true
    );
  end if;

  select * into v_row from public.magazzino_ricambi where id = p_ricambio_id for update;
  if not found then
    raise exception 'ricambio_not_found' using errcode = 'P0002';
  end if;

  if v_row.stock_version is distinct from p_expected_version then
    raise exception 'stock_version_conflict' using errcode = '23505';
  end if;

  v_new_q := v_row.quantita + p_delta;
  if v_new_q < 0 then
    raise exception 'insufficient_stock' using errcode = '23514';
  end if;

  if p_delta > 0 then
    v_tipo := 'entrata';
    v_abs_qty := p_delta;
  else
    v_tipo := 'uscita';
    v_abs_qty := abs(p_delta);
  end if;

  v_causale := coalesce(nullif(trim(p_causale), ''), case when v_tipo = 'entrata' then 'carico' else 'scarico' end);

  insert into public.movimenti_ricambi (
    ricambio_id,
    lavorazione_id,
    tipo,
    quantita,
    conta_statistiche,
    operation_id,
    meta,
    ordine_fornitore_id,
    ordine_fornitore_riga_id,
    delivery_batch_id
  ) values (
    p_ricambio_id,
    p_lavorazione_id,
    v_tipo,
    v_abs_qty,
    coalesce(p_conta_statistiche, true),
    p_operation_id,
    coalesce(p_meta, '{}'::jsonb) || jsonb_build_object('origine', p_origine, 'causale', v_causale),
    p_ordine_fornitore_id,
    p_ordine_fornitore_riga_id,
    p_delivery_batch_id
  )
  returning id into v_mov_id;

  update public.magazzino_ricambi
  set quantita = v_new_q,
      stock_version = stock_version + 1
  where id = p_ricambio_id
  returning * into v_row;

  return jsonb_build_object(
    'ricambio_id', v_row.id,
    'quantita', v_row.quantita,
    'stock_version', v_row.stock_version,
    'movimento_id', v_mov_id,
    'operation_id', p_operation_id,
    'quantita_before', v_row.quantita - p_delta,
    'delta', p_delta
  );
end;
$$;

grant execute on function public.stock_apply_movement(
  uuid, numeric, bigint, uuid, text, text, boolean, uuid, jsonb, uuid, uuid, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- Ricezione consegna ordine (atomica)
-- ---------------------------------------------------------------------------

create or replace function public.ordine_fornitore_receive_delivery(
  p_ordine_id uuid,
  p_batch_id text,
  p_lines jsonb,
  p_apply_stock boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_doc public.ordini_fornitori%rowtype;
  v_line jsonb;
  v_riga public.ordini_fornitori_righe%rowtype;
  v_target numeric(14, 3);
  v_delta numeric(14, 3);
  v_stock public.magazzino_ricambi%rowtype;
  v_stock_res jsonb;
  v_movimenti jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_complete boolean;
  v_op_id uuid;
begin
  if not public.rbac_module_can('ordini_fornitori', 'write') then
    raise exception 'Permesso negato';
  end if;

  if p_apply_stock and not public.rbac_module_can('magazzino', 'write') then
    raise exception 'Permesso magazzino richiesto per il carico';
  end if;

  if nullif(trim(p_batch_id), '') is null then
    raise exception 'batch_id obbligatorio';
  end if;

  select * into v_doc from public.ordini_fornitori where id = p_ordine_id for update;
  if not found then
    raise exception 'Ordine non trovato';
  end if;

  if v_doc.status <> 'in_consegna' then
    raise exception 'Ricezione consentita solo su ordini in consegna';
  end if;

  for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    select * into v_riga
    from public.ordini_fornitori_righe
    where id = (v_line->>'riga_id')::uuid
      and ordine_id = p_ordine_id
    for update;

    if not found then
      raise exception 'Riga ordine non trovata: %', v_line->>'riga_id';
    end if;

    v_target := (v_line->>'quantita_ricevuta_target')::numeric;
    if v_target < 0 or v_target > v_riga.quantita then
      raise exception 'Quantità ricevuta non valida per riga %', v_riga.id;
    end if;

    v_delta := v_target - v_riga.quantita_ricevuta;
    if v_delta < 0 then
      raise exception 'Quantità ricevuta non può diminuire per riga %', v_riga.id;
    end if;

    update public.ordini_fornitori_righe
    set quantita_ricevuta = v_target
    where id = v_riga.id;

    if p_apply_stock and v_delta > 0 then
      if v_riga.ricambio_id is null then
        v_warnings := v_warnings || jsonb_build_object(
          'riga_id', v_riga.id,
          'code', 'no_ricambio_id'
        );
      else
        v_op_id := gen_random_uuid();
        select * into v_stock from public.magazzino_ricambi where id = v_riga.ricambio_id;
        if not found then
          raise exception 'Ricambio non trovato per riga %', v_riga.id;
        end if;

        v_stock_res := public.stock_apply_movement(
          v_riga.ricambio_id,
          v_delta,
          v_stock.stock_version,
          v_op_id,
          'ordine_fornitore',
          'carico_ordine_fornitore',
          true,
          null,
          jsonb_build_object(
            'ordine_fornitore_id', p_ordine_id,
            'ordine_fornitore_riga_id', v_riga.id,
            'delivery_batch_id', p_batch_id
          ),
          p_ordine_id,
          v_riga.id,
          p_batch_id
        );

        v_movimenti := v_movimenti || jsonb_build_array(v_stock_res);
      end if;
    end if;
  end loop;

  select not exists (
    select 1
    from public.ordini_fornitori_righe r
    where r.ordine_id = p_ordine_id
      and r.quantita_ricevuta < r.quantita
  ) into v_complete;

  if v_complete then
    update public.ordini_fornitori
    set status = 'consegnato',
        data_consegna = coalesce(data_consegna, current_date),
        updated_by = v_uid
    where id = p_ordine_id;
    v_doc.status := 'consegnato';
  end if;

  return jsonb_build_object(
    'ordine_id', p_ordine_id,
    'status', v_doc.status,
    'complete', v_complete,
    'movimenti', v_movimenti,
    'warnings', v_warnings,
    'batch_id', p_batch_id
  );
end;
$$;

revoke all on function public.ordine_fornitore_receive_delivery(uuid, text, jsonb, boolean) from public;
grant execute on function public.ordine_fornitore_receive_delivery(uuid, text, jsonb, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- create_ordine: stati iniziali validi
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
  if v_status not in ('bozza', 'inviato') then
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
    logistica_snapshot,
    note, imponibile_righe, trasporto, imponibile, iva_percent, iva, totale,
    lavorazione_id, preventivo_id, scheda_lavorazione_id,
    meta,
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
    coalesce(p_payload->'logistica_snapshot', '{}'::jsonb),
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
    coalesce(p_payload->'meta', '{}'::jsonb),
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

commit;
