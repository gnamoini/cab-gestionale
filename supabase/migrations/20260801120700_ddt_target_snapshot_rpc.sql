-- Persist target attrezzatura + snapshot su create_ddt_with_rows (R3)

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
  v_serie := coalesce(nullif(trim(p_payload->>'serie'), ''), 'default');
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
