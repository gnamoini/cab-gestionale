-- Preventivi portale read-only: rimuove lifecycle acceptance, SSOT visibilità su stato_workflow=inviato.

begin;

-- ponytail: nessun dato live acceptance — normalizza acquisito legacy → inviato prima del constraint.
update public.preventivi
set stato_workflow = 'inviato'
where stato_workflow = 'acquisito';

do $do$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'preventivi'
      and column_name = 'stato'
  ) then
    update public.preventivi
    set stato_workflow = coalesce(
      nullif(stato_workflow, ''),
      case stato
        when 'confermato' then 'inviato'
        when 'annullato' then 'annullato'
        when 'inviato' then 'inviato'
        else 'bozza'
      end
    )
    where stato_workflow is null or stato_workflow = 'acquisito';
  else
    update public.preventivi
    set stato_workflow = coalesce(nullif(stato_workflow, ''), 'bozza')
    where stato_workflow is null or stato_workflow = 'acquisito';
  end if;
end;
$do$;

drop trigger if exists preventivi_block_pending_edit on public.preventivi;
drop function if exists public.trg_preventivi_block_pending_edit();

-- Drop/replace trigger functions that reference acceptance columns before DROP COLUMN.
drop trigger if exists preventivi_communication_outbox on public.preventivi;

drop function if exists public.commit_preventivo_client_response(uuid, text, text);
drop function if exists public.process_preventivo_acceptance_timeouts(int);

create or replace function public.trg_preventivi_communication_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.stato_workflow is not distinct from new.stato_workflow then
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

  return new;
end;
$$;

-- Replace RPC/helpers that reference acceptance columns before DROP COLUMN.
create or replace function public.build_preventivo_event_snapshot(p_row public.preventivi)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'versione', p_row.versione,
    'totale', p_row.totale,
    'stato_workflow', p_row.stato_workflow,
    'pdf_sent_hash', p_row.pdf_sent_hash,
    'inviato_at', p_row.inviato_at,
    'numero', coalesce(p_row.dettagli->>'numero', ''),
    'righe_count', coalesce(jsonb_array_length(p_row.dettagli->'righeRicambi'), 0)
  );
$$;

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
      and p.stato_workflow = 'inviato'
      and public.rbac_scope_cliente_lavorazioni_mezzo(p.mezzo_id)
  );
$$;

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

drop index if exists idx_preventivi_stato_cliente_pending;
drop index if exists idx_preventivi_stato;

alter table public.preventivi
  drop constraint if exists preventivi_stato_cliente_check,
  drop constraint if exists preventivi_metodo_accettazione_check,
  drop constraint if exists preventivi_stato_workflow_check;

alter table public.preventivi
  drop column if exists stato_cliente,
  drop column if exists scadenza_accettazione_at,
  drop column if exists metodo_accettazione,
  drop column if exists reminder_sent_at,
  drop column if exists accettato_at,
  drop column if exists rifiutato_at,
  drop column if exists confermato_at,
  drop column if exists confermato_by,
  drop column if exists stato;

alter table public.preventivi
  add constraint preventivi_stato_workflow_check
  check (stato_workflow in ('bozza', 'inviato', 'annullato'));

drop trigger if exists preventivi_communication_outbox on public.preventivi;
create trigger preventivi_communication_outbox
  after update of stato_workflow on public.preventivi
  for each row
  execute function public.trg_preventivi_communication_outbox();

-- ── pg_cron: rimuovi job timeout acceptance ──
do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'preventivo-acceptance-timeout-quarter-hourly';
  end if;
exception when others then
  null;
end;
$do$;

commit;
