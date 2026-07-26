-- SSOT preventivi/DDT: pdf_artifacts versionati, stato preventivo, token portale cliente

-- ---------------------------------------------------------------------------
-- pdf_artifacts
-- ---------------------------------------------------------------------------
create table if not exists public.pdf_artifacts (
  id              uuid primary key default gen_random_uuid(),
  entity_type     text not null check (entity_type in ('preventivo', 'ddt', 'fattura')),
  entity_id       uuid not null,
  storage_path    text not null,
  hash            text not null,
  version         integer not null default 1,
  status          text not null default 'generating'
                  check (status in ('generating', 'ready', 'failed', 'deleted')),
  is_current      boolean not null default false,
  generated_at    timestamptz not null default now(),
  generated_by    uuid references auth.users(id),
  unique (entity_type, entity_id, version)
);

create unique index if not exists uq_pdf_artifacts_current
  on public.pdf_artifacts (entity_type, entity_id)
  where is_current = true;

create index if not exists idx_pdf_artifacts_entity
  on public.pdf_artifacts (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- preventivi: stato lifecycle + artifact pointer
-- ---------------------------------------------------------------------------
alter table public.preventivi
  add column if not exists stato text not null default 'bozza'
    check (stato in ('bozza', 'inviato', 'confermato', 'annullato')),
  add column if not exists current_pdf_artifact_id uuid references public.pdf_artifacts(id) on delete set null,
  add column if not exists inviato_at timestamptz,
  add column if not exists confermato_at timestamptz,
  add column if not exists confermato_by uuid references auth.users(id) on delete set null,
  add column if not exists annullato_at timestamptz;

-- Backfill stato da dettagli JSON
update public.preventivi p
set stato = case coalesce(nullif(trim(p.dettagli->>'stato'), ''), 'bozza')
  when 'inviato' then 'inviato'
  when 'approvato' then 'confermato'
  when 'convertito' then 'confermato'
  when 'rifiutato' then 'annullato'
  when 'confermato' then 'confermato'
  when 'annullato' then 'annullato'
  else 'bozza'
end
where p.stato = 'bozza'
  and coalesce(nullif(trim(p.dettagli->>'stato'), ''), 'bozza') <> 'bozza';

create index if not exists idx_preventivi_stato on public.preventivi (stato);

-- ---------------------------------------------------------------------------
-- ddt_documents: artifact pointer
-- ---------------------------------------------------------------------------
alter table public.ddt_documents
  add column if not exists current_pdf_artifact_id uuid references public.pdf_artifacts(id) on delete set null;

-- ---------------------------------------------------------------------------
-- document_access_tokens (portale cliente)
-- ---------------------------------------------------------------------------
create table if not exists public.document_access_tokens (
  id              uuid primary key default gen_random_uuid(),
  token           text not null unique,
  entity_type     text not null check (entity_type in ('preventivo', 'ddt')),
  entity_id       uuid not null,
  lavorazione_id  uuid not null references public.lavorazioni(id) on delete cascade,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_by      uuid references auth.users(id) on delete set null
);

create index if not exists idx_doc_tokens_entity
  on public.document_access_tokens (entity_type, entity_id);

create unique index if not exists uq_doc_tokens_active
  on public.document_access_tokens (entity_type, entity_id)
  where revoked_at is null;

-- ---------------------------------------------------------------------------
-- Visibilità cliente (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
create or replace function public.is_preventivo_visible_to_client(p_preventivo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.preventivi p
    where p.id = p_preventivo_id
      and p.stato in ('inviato', 'confermato')
      and public.rbac_scope_cliente_lavorazioni_mezzo(p.mezzo_id)
  );
$$;

create or replace function public.is_ddt_visible_to_client(p_ddt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ddt_documents d
    where d.id = p_ddt_id
      and d.status <> 'annullato'
      and d.preventivo_id is not null
      and public.is_preventivo_visible_to_client(d.preventivo_id)
  );
$$;

revoke all on function public.is_preventivo_visible_to_client(uuid) from public;
revoke all on function public.is_ddt_visible_to_client(uuid) from public;
grant execute on function public.is_preventivo_visible_to_client(uuid) to authenticated;
grant execute on function public.is_ddt_visible_to_client(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: commit transizione stato preventivo (artifact opzionale su inviato)
-- ---------------------------------------------------------------------------
create or replace function public.commit_preventivo_status_transition(
  p_preventivo_id uuid,
  p_to_stato text,
  p_artifact jsonb default null,
  p_confermato_by uuid default null
)
returns public.preventivi
language plpgsql
security definer
set search_path = public
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

  if p_to_stato not in ('inviato', 'confermato', 'annullato') then
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
    else false
  end;

  if not v_allowed then
    raise exception 'Transizione non consentita: % → %', v_from, p_to_stato;
  end if;

  if p_to_stato = 'inviato' then
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
      updated_at = now()
    where id = p_preventivo_id
    returning * into v_row;

    -- Revoca token precedenti e crea nuovo token portale (solo se collegato a lavorazione)
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

revoke all on function public.commit_preventivo_status_transition(uuid, text, jsonb, uuid) from public;
grant execute on function public.commit_preventivo_status_transition(uuid, text, jsonb, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS pdf_artifacts
-- ---------------------------------------------------------------------------
alter table public.pdf_artifacts enable row level security;

drop policy if exists cap_pdf_artifacts_select on public.pdf_artifacts;
create policy cap_pdf_artifacts_select on public.pdf_artifacts
  for select to authenticated
  using (
    public.rbac_module_can('preventivi', 'read')
    or (
      entity_type = 'preventivo'
      and public.is_preventivo_visible_to_client(entity_id)
    )
    or (
      entity_type = 'ddt'
      and public.is_ddt_visible_to_client(entity_id)
    )
  );

drop policy if exists cap_pdf_artifacts_insert on public.pdf_artifacts;
create policy cap_pdf_artifacts_insert on public.pdf_artifacts
  for insert to authenticated
  with check (public.rbac_module_can('preventivi', 'write'));

drop policy if exists cap_pdf_artifacts_update on public.pdf_artifacts;
create policy cap_pdf_artifacts_update on public.pdf_artifacts
  for update to authenticated
  using (public.rbac_module_can('preventivi', 'write'))
  with check (public.rbac_module_can('preventivi', 'write'));

-- ---------------------------------------------------------------------------
-- RLS document_access_tokens
-- ---------------------------------------------------------------------------
alter table public.document_access_tokens enable row level security;

drop policy if exists cap_document_access_tokens_select on public.document_access_tokens;
create policy cap_document_access_tokens_select on public.document_access_tokens
  for select to authenticated
  using (
    public.rbac_module_can('preventivi', 'read')
    or (
      entity_type = 'preventivo'
      and public.is_preventivo_visible_to_client(entity_id)
    )
    or (
      entity_type = 'ddt'
      and public.is_ddt_visible_to_client(entity_id)
    )
  );

drop policy if exists cap_document_access_tokens_insert on public.document_access_tokens;
create policy cap_document_access_tokens_insert on public.document_access_tokens
  for insert to authenticated
  with check (public.rbac_module_can('preventivi', 'write'));

drop policy if exists cap_document_access_tokens_update on public.document_access_tokens;
create policy cap_document_access_tokens_update on public.document_access_tokens
  for update to authenticated
  using (public.rbac_module_can('preventivi', 'write'))
  with check (public.rbac_module_can('preventivi', 'write'));

-- ---------------------------------------------------------------------------
-- Aggiorna RLS preventivi per cliente (solo inviato/confermato)
-- ---------------------------------------------------------------------------
drop policy if exists cap_preventivi_select on public.preventivi;
create policy cap_preventivi_select on public.preventivi
  for select to authenticated
  using (
    public.rbac_can_read_row('preventivi', id)
    and (
      not public.rbac_is_cliente()
      or public.is_preventivo_visible_to_client(id)
    )
  );

-- ---------------------------------------------------------------------------
-- Legacy upload cleanup
-- ---------------------------------------------------------------------------
delete from public.lavorazione_documents;

revoke insert, update on public.lavorazione_documents from authenticated;
