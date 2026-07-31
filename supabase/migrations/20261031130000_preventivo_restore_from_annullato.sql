-- Ripristino preventivo annullato → bozza / inviato.

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
begin
  if not public.rbac_module_can('preventivi', 'write') then
    raise exception 'Permesso negato';
  end if;

  if p_to_stato not in ('bozza', 'inviato', 'confermato', 'annullato') then
    raise exception 'Stato destinazione non valido: %', p_to_stato;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_preventivo_id::text));

  select * into v_row from public.preventivi where id = p_preventivo_id for update;
  if not found then
    raise exception 'Preventivo non trovato';
  end if;

  v_from := v_row.stato;

  v_allowed := case v_from
    when 'bozza' then p_to_stato in ('inviato', 'annullato')
    when 'inviato' then p_to_stato in ('confermato', 'annullato')
    when 'confermato' then p_to_stato = 'annullato'
    when 'annullato' then p_to_stato in ('bozza', 'inviato')
    else false
  end;

  if not v_allowed then
    raise exception 'Transizione non consentita: % → %', v_from, p_to_stato;
  end if;

  if p_to_stato = 'bozza' then
    update public.document_access_tokens
    set revoked_at = now()
    where entity_type = 'preventivo' and entity_id = p_preventivo_id and revoked_at is null;

    update public.preventivi
    set
      stato = 'bozza',
      annullato_at = null,
      inviato_at = null,
      confermato_at = null,
      confermato_by = null,
      current_pdf_artifact_id = null,
      updated_at = now()
    where id = p_preventivo_id
    returning * into v_row;

  elsif p_to_stato = 'inviato' then
    if p_artifact is null or nullif(trim(p_artifact->>'storage_path'), '') is null then
      raise exception 'Artifact PDF obbligatorio per transizione a inviato';
    end if;

    select coalesce(max(version), 0) + 1 into v_version
    from public.pdf_artifacts
    where entity_type = 'preventivo' and entity_id = p_preventivo_id;

    update public.pdf_artifacts
    set is_current = false
    where entity_type = 'preventivo' and entity_id = p_preventivo_id and is_current = true;

    insert into public.pdf_artifacts (
      entity_type, entity_id, storage_path, hash, version, status, is_current, generated_by
    )
    values (
      'preventivo',
      p_preventivo_id,
      trim(p_artifact->>'storage_path'),
      coalesce(nullif(trim(p_artifact->>'hash'), ''), 'unknown'),
      v_version,
      'ready',
      true,
      v_uid
    )
    returning id into v_artifact_id;

    update public.preventivi
    set
      stato = 'inviato',
      current_pdf_artifact_id = v_artifact_id,
      inviato_at = now(),
      annullato_at = null,
      confermato_at = null,
      confermato_by = null,
      updated_at = now()
    where id = p_preventivo_id
    returning * into v_row;

    update public.document_access_tokens
    set revoked_at = now()
    where entity_type = 'preventivo' and entity_id = p_preventivo_id and revoked_at is null;

    if v_row.lavorazione_id is not null then
      v_token := encode(gen_random_bytes(16), 'hex');
      insert into public.document_access_tokens (
        token, entity_type, entity_id, lavorazione_id, created_by
      )
      values (
        v_token,
        'preventivo',
        p_preventivo_id,
        v_row.lavorazione_id,
        v_uid
      );
    end if;

  elsif p_to_stato = 'confermato' then
    update public.preventivi
    set
      stato = 'confermato',
      confermato_at = now(),
      confermato_by = coalesce(p_confermato_by, v_uid),
      updated_at = now()
    where id = p_preventivo_id
    returning * into v_row;

  elsif p_to_stato = 'annullato' then
    update public.pdf_artifacts
    set status = 'deleted', is_current = false
    where entity_type = 'preventivo' and entity_id = p_preventivo_id and is_current = true;

    update public.document_access_tokens
    set revoked_at = now()
    where entity_type = 'preventivo' and entity_id = p_preventivo_id and revoked_at is null;

    update public.preventivi
    set
      stato = 'annullato',
      annullato_at = now(),
      current_pdf_artifact_id = null,
      updated_at = now()
    where id = p_preventivo_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;
