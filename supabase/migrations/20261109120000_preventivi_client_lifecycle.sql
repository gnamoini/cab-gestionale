-- Preventivi client lifecycle: dual-state, versioning, audit events, PDF sent snapshot, RPC.

begin;

-- ── New columns ──
alter table public.preventivi
  add column if not exists stato_workflow text,
  add column if not exists stato_cliente text,
  add column if not exists versione integer not null default 1,
  add column if not exists parent_preventivo_id uuid references public.preventivi(id) on delete set null,
  add column if not exists visualizzato_at timestamptz,
  add column if not exists accettato_at timestamptz,
  add column if not exists rifiutato_at timestamptz,
  add column if not exists scadenza_accettazione_at timestamptz,
  add column if not exists metodo_accettazione text,
  add column if not exists pdf_sent_artifact_id uuid references public.pdf_artifacts(id) on delete set null,
  add column if not exists pdf_sent_hash text,
  add column if not exists pdf_sent_generated_at timestamptz,
  add column if not exists reminder_sent_at timestamptz;

alter table public.preventivi
  drop constraint if exists preventivi_metodo_accettazione_check;

alter table public.preventivi
  add constraint preventivi_metodo_accettazione_check
  check (metodo_accettazione is null or metodo_accettazione in ('cliente', 'timeout_automatico'));

alter table public.preventivi
  drop constraint if exists preventivi_stato_cliente_check;

alter table public.preventivi
  add constraint preventivi_stato_cliente_check
  check (stato_cliente is null or stato_cliente in ('pending', 'accettato', 'rifiutato'));

-- Backfill from legacy stato
update public.preventivi p
set
  stato_workflow = case p.stato
    when 'confermato' then 'acquisito'
    else p.stato
  end,
  stato_cliente = case p.stato
    when 'inviato' then 'pending'
    when 'confermato' then 'accettato'
    else null
  end,
  accettato_at = p.confermato_at,
  metodo_accettazione = case
    when p.stato = 'confermato' then 'cliente'
    else null
  end
where p.stato_workflow is null;

update public.preventivi
set stato_workflow = 'bozza'
where stato_workflow is null;

alter table public.preventivi
  alter column stato_workflow set not null;

alter table public.preventivi
  drop constraint if exists preventivi_stato_workflow_check;

alter table public.preventivi
  add constraint preventivi_stato_workflow_check
  check (stato_workflow in ('bozza', 'inviato', 'acquisito', 'annullato'));

create index if not exists idx_preventivi_stato_cliente_pending
  on public.preventivi (scadenza_accettazione_at)
  where stato_cliente = 'pending' and stato_workflow = 'inviato';

-- ── Audit events ──
create table if not exists public.preventivo_events (
  id uuid primary key default gen_random_uuid(),
  preventivo_id uuid not null references public.preventivi(id) on delete cascade,
  event_type text not null,
  actor_type text not null check (actor_type in ('staff', 'cliente', 'system')),
  actor_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_preventivo_events_preventivo_created
  on public.preventivo_events (preventivo_id, created_at desc);

alter table public.preventivo_events enable row level security;

drop policy if exists preventivo_events_select on public.preventivo_events;
create policy preventivo_events_select on public.preventivo_events
  for select to authenticated
  using (public.rbac_module_can('preventivi', 'read'));

-- ── Snapshot helper ──
create or replace function public.build_preventivo_event_snapshot(p_row public.preventivi)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'versione', p_row.versione,
    'totale', p_row.totale,
    'stato_workflow', p_row.stato_workflow,
    'stato_cliente', p_row.stato_cliente,
    'pdf_sent_hash', p_row.pdf_sent_hash,
    'inviato_at', p_row.inviato_at,
    'scadenza_accettazione_at', p_row.scadenza_accettazione_at,
    'numero', coalesce(p_row.dettagli->>'numero', ''),
    'righe_count', coalesce(jsonb_array_length(p_row.dettagli->'righeRicambi'), 0)
  );
$$;

create or replace function public.append_preventivo_event(
  p_preventivo_id uuid,
  p_event_type text,
  p_actor_type text,
  p_actor_id uuid,
  p_payload jsonb default '{}'::jsonb,
  p_snapshot jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.preventivi%rowtype;
  v_id uuid;
begin
  select * into v_row from public.preventivi where id = p_preventivo_id;
  if not found then
    raise exception 'Preventivo non trovato';
  end if;

  insert into public.preventivo_events (
    preventivo_id, event_type, actor_type, actor_id, payload, snapshot
  )
  values (
    p_preventivo_id,
    p_event_type,
    p_actor_type,
    p_actor_id,
    coalesce(p_payload, '{}'::jsonb),
    coalesce(p_snapshot, public.build_preventivo_event_snapshot(v_row))
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.append_preventivo_event(uuid, text, text, uuid, jsonb, jsonb) from public;
grant execute on function public.append_preventivo_event(uuid, text, text, uuid, jsonb, jsonb) to authenticated;

-- ── Edit lock bypass flag for RPC ──
create or replace function public.preventivo_rpc_bypass_edit_lock()
returns boolean
language sql
stable
as $$
  select coalesce(nullif(current_setting('app.preventivo_rpc', true), ''), '0') = '1';
$$;

create or replace function public.trg_preventivi_block_pending_edit()
returns trigger
language plpgsql
as $$
begin
  if public.preventivo_rpc_bypass_edit_lock() then
    return new;
  end if;

  if old.stato_cliente is distinct from 'pending' then
    return new;
  end if;

  if new.dettagli is distinct from old.dettagli
     or new.totale is distinct from old.totale
     or new.mezzo_id is distinct from old.mezzo_id
     or new.lavorazione_id is distinct from old.lavorazione_id
     or new.cliente is distinct from old.cliente then
    raise exception 'Modifica non consentita: preventivo in attesa risposta cliente';
  end if;

  return new;
end;
$$;

drop trigger if exists preventivi_block_pending_edit on public.preventivi;
create trigger preventivi_block_pending_edit
  before update on public.preventivi
  for each row
  execute function public.trg_preventivi_block_pending_edit();

-- ── Client visibility ──
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
      and p.inviato_at is not null
      and (
        p.stato_workflow in ('inviato', 'acquisito')
        or p.stato_cliente in ('pending', 'accettato', 'rifiutato')
      )
      and public.rbac_scope_cliente_lavorazioni_mezzo(p.mezzo_id)
  );
$$;

-- ── Staff status transition RPC ──
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
    when 'acquisito' then p_to_stato = 'annullato'
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
      stato_cliente = 'pending',
      versione = case when v_was_sent then versione + 1 else versione end,
      current_pdf_artifact_id = v_artifact_id,
      pdf_sent_artifact_id = v_artifact_id,
      pdf_sent_hash = v_hash,
      pdf_sent_generated_at = now(),
      inviato_at = now(),
      scadenza_accettazione_at = now() + interval '24 hours',
      visualizzato_at = null,
      accettato_at = null,
      rifiutato_at = null,
      metodo_accettazione = null,
      confermato_at = null,
      confermato_by = null,
      annullato_at = null,
      updated_at = now()
    where id = p_preventivo_id
    returning * into v_row;

    update public.document_access_tokens
    set revoked_at = now()
    where entity_type = 'preventivo' and entity_id = p_preventivo_id and revoked_at is null;

    v_token := encode(gen_random_bytes(16), 'hex');
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
      stato_cliente = null,
      scadenza_accettazione_at = null,
      metodo_accettazione = null,
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

  -- Sync legacy stato column for transitional readers
  update public.preventivi
  set stato = case v_row.stato_workflow
    when 'acquisito' then 'confermato'
    else v_row.stato_workflow
  end
  where id = p_preventivo_id;

  select * into v_row from public.preventivi where id = p_preventivo_id;
  return v_row;
end;
$$;

-- ── Client response RPC ──
create or replace function public.commit_preventivo_client_response(
  p_preventivo_id uuid,
  p_action text,
  p_motivazione text default null
)
returns public.preventivi
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_row public.preventivi%rowtype;
begin
  perform set_config('app.preventivo_rpc', '1', true);

  select * into v_row from public.preventivi where id = p_preventivo_id for update;
  if not found then
    raise exception 'Preventivo non trovato';
  end if;

  if not public.rbac_scope_cliente_lavorazioni_mezzo(v_row.mezzo_id) then
    raise exception 'Permesso negato';
  end if;

  if v_row.stato_workflow <> 'inviato' or v_row.stato_cliente <> 'pending' then
    raise exception 'Preventivo non in attesa di risposta';
  end if;

  if v_row.scadenza_accettazione_at is not null and v_row.scadenza_accettazione_at <= now() then
    raise exception 'Termine per la risposta scaduto';
  end if;

  if p_action = 'accept' then
    update public.preventivi
    set
      stato_workflow = 'acquisito',
      stato_cliente = 'accettato',
      accettato_at = now(),
      metodo_accettazione = 'cliente',
      confermato_at = now(),
      confermato_by = null,
      updated_at = now()
    where id = p_preventivo_id
    returning * into v_row;

    perform public.append_preventivo_event(
      p_preventivo_id, 'accepted_client', 'cliente', v_uid,
      jsonb_build_object('method', 'cliente'), null
    );

  elsif p_action = 'reject' then
    update public.preventivi
    set
      stato_cliente = 'rifiutato',
      rifiutato_at = now(),
      updated_at = now()
    where id = p_preventivo_id
    returning * into v_row;

    perform public.append_preventivo_event(
      p_preventivo_id, 'rejected_client', 'cliente', v_uid,
      jsonb_build_object('motivazione', coalesce(p_motivazione, '')), null
    );
  else
    raise exception 'Azione non valida: %', p_action;
  end if;

  update public.preventivi
  set stato = case v_row.stato_workflow
    when 'acquisito' then 'confermato'
    else v_row.stato_workflow
  end
  where id = p_preventivo_id;

  select * into v_row from public.preventivi where id = p_preventivo_id;
  return v_row;
end;
$$;

revoke all on function public.commit_preventivo_client_response(uuid, text, text) from public;
grant execute on function public.commit_preventivo_client_response(uuid, text, text) to authenticated;

-- ── Timeout batch RPC ──
create or replace function public.process_preventivo_acceptance_timeouts(p_limit int default 50)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_row public.preventivi%rowtype;
begin
  perform set_config('app.preventivo_rpc', '1', true);

  for v_row in
    select * from public.preventivi
    where stato_workflow = 'inviato'
      and stato_cliente = 'pending'
      and scadenza_accettazione_at is not null
      and scadenza_accettazione_at <= now()
    order by scadenza_accettazione_at asc
    limit greatest(1, least(p_limit, 500))
    for update skip locked
  loop
    update public.preventivi
    set
      stato_workflow = 'acquisito',
      stato_cliente = 'accettato',
      accettato_at = v_row.scadenza_accettazione_at,
      metodo_accettazione = 'timeout_automatico',
      confermato_at = v_row.scadenza_accettazione_at,
      updated_at = now()
    where id = v_row.id;

    perform public.append_preventivo_event(
      v_row.id, 'accepted_timeout', 'system', null,
      jsonb_build_object('method', 'timeout_automatico'), null
    );

    update public.preventivi
    set stato = 'confermato'
    where id = v_row.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.process_preventivo_acceptance_timeouts(int) from public;
grant execute on function public.process_preventivo_acceptance_timeouts(int) to service_role;

-- ── Mark viewed ──
create or replace function public.mark_preventivo_viewed_by_client(p_preventivo_id uuid)
returns public.preventivi
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_row public.preventivi%rowtype;
begin
  perform set_config('app.preventivo_rpc', '1', true);

  select * into v_row from public.preventivi where id = p_preventivo_id for update;
  if not found then
    raise exception 'Preventivo non trovato';
  end if;

  if not public.rbac_scope_cliente_lavorazioni_mezzo(v_row.mezzo_id) then
    raise exception 'Permesso negato';
  end if;

  if v_row.visualizzato_at is null then
    update public.preventivi
    set visualizzato_at = now(), updated_at = now()
    where id = p_preventivo_id
    returning * into v_row;

    perform public.append_preventivo_event(
      p_preventivo_id, 'viewed', 'cliente', v_uid, '{}'::jsonb, null
    );
  end if;

  return v_row;
end;
$$;

revoke all on function public.mark_preventivo_viewed_by_client(uuid) from public;
grant execute on function public.mark_preventivo_viewed_by_client(uuid) to authenticated;

-- ── Communication outbox trigger (workflow) ──
create or replace function public.trg_preventivi_communication_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.stato_workflow is not distinct from new.stato_workflow
     and old.stato_cliente is not distinct from new.stato_cliente then
    return new;
  end if;

  if new.stato_workflow = 'inviato' and old.stato_workflow is distinct from 'inviato' then
    perform public.cab_enqueue_communication_outbox(
      'preventivo.status_changed',
      'preventivi',
      new.id,
      'comm:preventivo.status_changed:preventivi:' || new.id::text || ':inviato:v' || new.versione::text,
      null,
      jsonb_build_object('from', old.stato_workflow::text, 'to', 'inviato', 'versione', new.versione),
      null
    );
  end if;

  return new;
end;
$$;

drop trigger if exists preventivi_communication_outbox on public.preventivi;
create trigger preventivi_communication_outbox
  after update of stato_workflow, stato_cliente on public.preventivi
  for each row
  execute function public.trg_preventivi_communication_outbox();

-- ── Notification outbox trigger ──
create or replace function public.trg_preventivi_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.cab_enqueue_notification_outbox(
      'preventivi.created',
      'preventivi',
      new.id,
      'preventivi.created:preventivi:' || new.id::text,
      new.created_by,
      jsonb_build_object('cliente', new.cliente),
      null
    );
    return new;
  end if;

  if new.lavorazione_id is not null
     and (old.lavorazione_id is null or old.lavorazione_id is distinct from new.lavorazione_id) then
    perform public.cab_enqueue_notification_outbox(
      'preventivi.converted',
      'preventivi',
      new.id,
      'preventivi.converted:preventivi:' || new.id::text || ':' || new.lavorazione_id::text,
      new.created_by,
      jsonb_build_object('cliente', new.cliente, 'lavorazione_id', new.lavorazione_id),
      null
    );
  end if;

  if old.stato_workflow is distinct from new.stato_workflow
     and new.stato_workflow = 'inviato' then
    perform public.cab_enqueue_notification_outbox(
      'preventivi.sent',
      'preventivi',
      new.id,
      'preventivi.sent:preventivi:' || new.id::text || ':v' || new.versione::text,
      new.created_by,
      jsonb_build_object('cliente', new.cliente, 'versione', new.versione),
      null
    );
  end if;

  if old.stato_cliente is distinct from new.stato_cliente then
    if new.stato_cliente = 'accettato' then
      perform public.cab_enqueue_notification_outbox(
        'preventivi.accepted',
        'preventivi',
        new.id,
        'preventivi.accepted:preventivi:' || new.id::text || ':' || coalesce(new.metodo_accettazione, 'unknown'),
        new.created_by,
        jsonb_build_object(
          'cliente', new.cliente,
          'lavorazione_id', new.lavorazione_id,
          'totale', new.totale,
          'method', coalesce(new.metodo_accettazione, 'cliente'),
          'versione', new.versione
        ),
        null
      );
    elsif new.stato_cliente = 'rifiutato' then
      perform public.cab_enqueue_notification_outbox(
        'preventivi.rejected',
        'preventivi',
        new.id,
        'preventivi.rejected:preventivi:' || new.id::text,
        new.created_by,
        jsonb_build_object(
          'cliente', new.cliente,
          'lavorazione_id', new.lavorazione_id,
          'totale', new.totale,
          'versione', new.versione
        ),
        null
      );
    end if;
  end if;

  return new;
end;
$$;

-- Notification type registry (preventivo_accettato)
insert into public.notification_type_registry (
  type, allowed_scope_type, allowed_scope_value, allowed_scope_module, default_priority, caller_min_role
)
values (
  'preventivo_accettato', 'role', 'addetto_amministrativo', 'preventivi', 'high', 'staff'
)
on conflict (type) do nothing;

insert into public.notification_templates (notification_type, title_template, body_template, deep_link_pattern)
values (
  'preventivo_accettato',
  'Preventivo accettato',
  'Preventivo accettato dal cliente o per timeout',
  '/preventivi'
)
on conflict (notification_type) do nothing;

commit;
