-- SEC-21: bump document_access_tokens entropy gen_random_bytes(16) → gen_random_bytes(32)

create or replace function public.commit_preventivo_status_transition(
  p_preventivo_id uuid,
  p_to_stato text,
  p_artifact jsonb default null,
  p_confermato_by uuid default null
)
returns public.preventivi
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_row public.preventivi%rowtype;
  v_from text;
  v_allowed boolean;
  v_artifact_id uuid;
  v_version integer;
  v_token text;
  v_hash text;
  v_was_sent boolean;
begin
  perform set_config('app.preventivo_rpc', '1', true);

  if not public.rbac_module_can('preventivi', 'write') then
    raise exception 'Permesso negato';
  end if;

  if p_to_stato not in ('bozza', 'inviato', 'annullato') then
    raise exception 'Stato workflow destinazione non valido: %', p_to_stato;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_preventivo_id::text));

  select * into v_row from public.preventivi where id = p_preventivo_id for update;
  if not found then
    raise exception 'Preventivo non trovato';
  end if;

  v_from := v_row.stato_workflow;
  v_was_sent := v_row.inviato_at is not null;

  if v_from = p_to_stato then
    raise exception 'Transizione non consentita: % → %', v_from, p_to_stato;
  end if;

  v_allowed := case v_from
    when 'bozza' then p_to_stato in ('inviato', 'annullato')
    when 'inviato' then p_to_stato in ('bozza', 'annullato')
    else false
  end;

  if not v_allowed then
    raise exception 'Transizione non consentita: % → %', v_from, p_to_stato;
  end if;

  if p_to_stato = 'inviato' then
    if v_row.lavorazione_id is null then
      raise exception 'Lavorazione obbligatoria per invio preventivo';
    end if;
    if p_artifact is null or nullif(trim(p_artifact->>'storage_path'), '') is null then
      raise exception 'Artifact PDF obbligatorio per transizione a inviato';
    end if;

    select coalesce(max(version), 0) + 1 into v_version
    from public.pdf_artifacts
    where entity_type = 'preventivo' and entity_id = p_preventivo_id;

    update public.pdf_artifacts
    set is_current = false
    where entity_type = 'preventivo' and entity_id = p_preventivo_id and is_current = true;

    v_hash := coalesce(nullif(trim(p_artifact->>'hash'), ''), 'unknown');

    insert into public.pdf_artifacts (
      entity_type, entity_id, storage_path, hash, version, status, is_current, generated_by
    )
    values (
      'preventivo',
      p_preventivo_id,
      trim(p_artifact->>'storage_path'),
      v_hash,
      v_version,
      'ready',
      true,
      v_uid
    )
    returning id into v_artifact_id;

    update public.preventivi
    set
      stato_workflow = 'inviato',
      versione = case when v_was_sent then versione + 1 else versione end,
      current_pdf_artifact_id = v_artifact_id,
      pdf_sent_artifact_id = v_artifact_id,
      pdf_sent_hash = v_hash,
      pdf_sent_generated_at = now(),
      inviato_at = now(),
      visualizzato_at = null,
      annullato_at = null,
      updated_at = now()
    where id = p_preventivo_id
    returning * into v_row;

    update public.document_access_tokens
    set revoked_at = now()
    where entity_type = 'preventivo' and entity_id = p_preventivo_id and revoked_at is null;

    v_token := encode(gen_random_bytes(32), 'hex');
    insert into public.document_access_tokens (token, entity_type, entity_id, lavorazione_id, created_by)
    values (v_token, 'preventivo', p_preventivo_id, v_row.lavorazione_id, v_uid);

    if v_was_sent then
      perform public.append_preventivo_event(
        p_preventivo_id, 'version_incremented', 'staff', v_uid,
        jsonb_build_object('versione', v_row.versione), null
      );
    end if;

    perform public.append_preventivo_event(
      p_preventivo_id, 'sent', 'staff', v_uid,
      jsonb_build_object('versione', v_row.versione), null
    );

  elsif p_to_stato = 'bozza' then
    update public.document_access_tokens
    set revoked_at = now()
    where entity_type = 'preventivo' and entity_id = p_preventivo_id and revoked_at is null;

    update public.preventivi
    set
      stato_workflow = 'bozza',
      updated_at = now()
    where id = p_preventivo_id
    returning * into v_row;

    perform public.append_preventivo_event(
      p_preventivo_id, 'withdrawn', 'staff', v_uid, '{}'::jsonb, null
    );

  elsif p_to_stato = 'annullato' then
    update public.pdf_artifacts
    set status = 'deleted', is_current = false
    where entity_type = 'preventivo' and entity_id = p_preventivo_id and is_current = true;

    update public.document_access_tokens
    set revoked_at = now()
    where entity_type = 'preventivo' and entity_id = p_preventivo_id and revoked_at is null;

    update public.preventivi
    set
      stato_workflow = 'annullato',
      annullato_at = now(),
      current_pdf_artifact_id = null,
      updated_at = now()
    where id = p_preventivo_id
    returning * into v_row;

    perform public.append_preventivo_event(
      p_preventivo_id, 'cancelled', 'staff', v_uid, '{}'::jsonb, null
    );
  end if;

  select * into v_row from public.preventivi where id = p_preventivo_id;
  return v_row;
end;
$$;

create or replace function public.commit_ddt_pdf_artifact(
  p_ddt_id uuid,
  p_storage_path text,
  p_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_ddt public.ddt_documents%rowtype;
  v_artifact_id uuid;
  v_version integer;
  v_token text;
begin
  if not public.rbac_module_can('preventivi', 'write') then
    raise exception 'Permesso negato';
  end if;

  if nullif(trim(p_storage_path), '') is null then
    raise exception 'storage_path obbligatorio';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_ddt_id::text));

  select * into v_ddt from public.ddt_documents where id = p_ddt_id for update;
  if not found then
    raise exception 'DDT non trovato';
  end if;

  if v_ddt.status = 'annullato' then
    raise exception 'DDT annullato';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
  from public.pdf_artifacts
  where entity_type = 'ddt' and entity_id = p_ddt_id;

  update public.pdf_artifacts
  set is_current = false
  where entity_type = 'ddt' and entity_id = p_ddt_id and is_current = true;

  insert into public.pdf_artifacts (
    entity_type, entity_id, storage_path, hash, version, status, is_current, generated_by
  )
  values (
    'ddt',
    p_ddt_id,
    trim(p_storage_path),
    coalesce(nullif(trim(p_hash), ''), 'unknown'),
    v_version,
    'ready',
    true,
    v_uid
  )
  returning id into v_artifact_id;

  update public.ddt_documents
  set current_pdf_artifact_id = v_artifact_id, updated_at = now()
  where id = p_ddt_id;

  update public.document_access_tokens
  set revoked_at = now()
  where entity_type = 'ddt' and entity_id = p_ddt_id and revoked_at is null;

  if v_ddt.lavorazione_id is not null then
    v_token := encode(gen_random_bytes(32), 'hex');
    insert into public.document_access_tokens (
      token, entity_type, entity_id, lavorazione_id, created_by
    )
    values (
      v_token,
      'ddt',
      p_ddt_id,
      v_ddt.lavorazione_id,
      v_uid
    );
  end if;

  return v_artifact_id;
end;
$$;
