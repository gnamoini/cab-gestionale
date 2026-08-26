-- SEC-20: valida transizioni stato in update_ordine_fornitore_draft (allineato a ordine-fornitore-status-transitions.ts)

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
  v_new_status text;
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

  if p_payload ? 'status' then
    v_new_status := coalesce(nullif(trim(p_payload->>'status'), ''), v_doc.status);
    if v_new_status not in ('bozza', 'inviato', 'in_consegna', 'consegnato', 'annullato') then
      raise exception 'Stato ordine non valido: %', v_new_status;
    end if;
    if v_new_status <> v_doc.status then
      if not (
        case v_doc.status
          when 'bozza' then v_new_status in ('inviato', 'annullato')
          when 'inviato' then v_new_status in ('in_consegna', 'annullato')
          when 'in_consegna' then v_new_status = 'annullato'
          else false
        end
      ) then
        raise exception 'Transizione stato non consentita: % → %', v_doc.status, v_new_status;
      end if;
    end if;
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
