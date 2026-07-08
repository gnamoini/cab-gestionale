-- Ordini fornitori: stati spedito / ricevuto nel workflow

begin;

alter table public.ordini_fornitori
  drop constraint if exists ordini_fornitori_status_chk;

alter table public.ordini_fornitori
  add constraint ordini_fornitori_status_chk check (
    status in ('bozza', 'inviato', 'confermato', 'spedito', 'ricevuto', 'annullato')
  );

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
  if v_status not in ('bozza', 'inviato', 'confermato', 'spedito', 'ricevuto') then
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

commit;
