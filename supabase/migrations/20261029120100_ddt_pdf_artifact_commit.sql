-- DDT: commit artifact PDF ufficiale + token portale cliente

create or replace function public.commit_ddt_pdf_artifact(
  p_ddt_id uuid,
  p_storage_path text,
  p_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
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
    v_token := encode(gen_random_bytes(16), 'hex');
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

revoke all on function public.commit_ddt_pdf_artifact(uuid, text, text) from public;
grant execute on function public.commit_ddt_pdf_artifact(uuid, text, text) to authenticated;
