-- Document Capture apply lock: applying status + begin/complete/abort RPC

begin;

alter table public.document_capture
  drop constraint if exists document_capture_status_chk;

alter table public.document_capture
  add constraint document_capture_status_chk check (
    status in (
      'pending_upload', 'expired_upload', 'uploaded', 'review_required',
      'analyzing', 'review', 'dry_run', 'applying', 'applied', 'archived', 'failed'
    )
  );

create or replace function public.document_capture_assert_status_transition(p_from text, p_to text)
returns void
language plpgsql
immutable
as $$
begin
  if p_from = p_to then return; end if;
  if p_from = 'pending_upload' and p_to in ('uploaded', 'failed', 'expired_upload') then return; end if;
  if p_from = 'expired_upload' and p_to = 'archived' then return; end if;
  if p_from = 'uploaded' and p_to in ('archived', 'failed', 'analyzing', 'review_required') then return; end if;
  if p_from = 'analyzing' and p_to in ('review', 'failed') then return; end if;
  if p_from = 'review' and p_to in ('dry_run', 'archived', 'failed') then return; end if;
  if p_from = 'review_required' and p_to in ('analyzing', 'archived', 'failed') then return; end if;
  if p_from = 'dry_run' and p_to in ('applying', 'applied', 'failed', 'review') then return; end if;
  if p_from = 'applying' and p_to in ('applied', 'failed') then return; end if;
  if p_from = 'failed' and p_to in ('archived', 'applying') then return; end if;
  if p_from = 'applied' and p_to = 'archived' then return; end if;
  if p_from = 'archived' then
    raise exception 'Transizione non consentita: % → %', p_from, p_to;
  end if;
  raise exception 'Transizione non consentita: % → %', p_from, p_to;
end;
$$;

create or replace function public.document_capture_begin_apply(
  p_capture_id uuid,
  p_application_id uuid,
  p_resume boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  dc record;
  app record;
  v_new_version integer;
begin
  if v_uid is null then raise exception 'Non autenticato'; end if;
  v_company := public.rbac_user_company_id();
  if v_company is null then raise exception 'Tenant non configurato per l''utente'; end if;
  if not public.rbac_module_can('document_capture', 'write') then raise exception 'Permesso negato'; end if;

  select * into dc from public.document_capture
  where id = p_capture_id and company_id = v_company and deleted_at is null
  for update;
  if not found then raise exception 'Capture non trovato'; end if;

  if dc.status = 'applying' then
    raise exception 'apply_in_progress';
  end if;

  if p_resume then
    if dc.status <> 'failed' then
      raise exception 'Resume consentito solo da failed';
    end if;
  elsif dc.status <> 'dry_run' then
    raise exception 'Apply consentito solo da dry_run';
  end if;

  select * into app from public.document_capture_applications
  where id = p_application_id
    and document_capture_id = p_capture_id
    and company_id = v_company
    and kind = 'dry_run';
  if not found then raise exception 'Dry-run non trovato'; end if;

  perform public.document_capture_assert_status_transition(dc.status, 'applying');

  update public.document_capture
  set status = 'applying',
      capture_version = capture_version + 1,
      updated_at = now()
  where id = p_capture_id
  returning capture_version into v_new_version;

  insert into public.document_capture_events (
    company_id, document_capture_id, event_type, idempotency_key, actor_id, payload
  ) values (
    v_company, p_capture_id, 'apply_started',
    'apply_started:' || p_application_id::text,
    v_uid,
    jsonb_build_object(
      'applicationId', p_application_id,
      'resume', p_resume,
      'captureVersion', v_new_version
    )
  )
  on conflict (document_capture_id, idempotency_key) do nothing;

  return jsonb_build_object(
    'ok', true,
    'captureId', p_capture_id,
    'applicationId', p_application_id,
    'captureVersion', v_new_version,
    'status', 'applying'
  );
end;
$$;

create or replace function public.document_capture_complete_apply(
  p_capture_id uuid,
  p_application_id uuid,
  p_success boolean,
  p_event_type text,
  p_lavorazione_id uuid default null,
  p_mezzo_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  dc record;
  v_new_status text;
  v_new_version integer;
  v_idempotency text;
begin
  if v_uid is null then raise exception 'Non autenticato'; end if;
  v_company := public.rbac_user_company_id();
  if v_company is null then raise exception 'Tenant non configurato per l''utente'; end if;
  if not public.rbac_module_can('document_capture', 'write') then raise exception 'Permesso negato'; end if;

  if p_event_type not in ('apply_committed', 'apply_failed', 'apply_partial') then
    raise exception 'event_type non valido';
  end if;

  select * into dc from public.document_capture
  where id = p_capture_id and company_id = v_company and deleted_at is null
  for update;
  if not found then raise exception 'Capture non trovato'; end if;
  if dc.status <> 'applying' then raise exception 'Capture non in applying'; end if;

  v_new_status := case when p_success then 'applied' else 'failed' end;
  perform public.document_capture_assert_status_transition(dc.status, v_new_status);

  update public.document_capture
  set status = v_new_status,
      lavorazione_id = coalesce(p_lavorazione_id, lavorazione_id),
      mezzo_id = coalesce(p_mezzo_id, mezzo_id),
      capture_version = capture_version + 1,
      updated_at = now()
  where id = p_capture_id
  returning capture_version into v_new_version;

  v_idempotency := p_event_type || ':' || p_application_id::text;

  insert into public.document_capture_events (
    company_id, document_capture_id, event_type, idempotency_key, actor_id, payload
  ) values (
    v_company, p_capture_id, p_event_type, v_idempotency, v_uid,
    coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
      'applicationId', p_application_id,
      'captureVersion', v_new_version,
      'lavorazioneId', p_lavorazione_id,
      'mezzoId', p_mezzo_id
    )
  )
  on conflict (document_capture_id, idempotency_key) do nothing;

  return jsonb_build_object('ok', true, 'status', v_new_status, 'captureVersion', v_new_version);
end;
$$;

create or replace function public.document_capture_abort_apply(
  p_capture_id uuid,
  p_application_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  dc record;
begin
  if v_uid is null then raise exception 'Non autenticato'; end if;
  v_company := public.rbac_user_company_id();
  if v_company is null then raise exception 'Tenant non configurato per l''utente'; end if;
  if not public.rbac_module_can('document_capture', 'write') then raise exception 'Permesso negato'; end if;

  select * into dc from public.document_capture
  where id = p_capture_id and company_id = v_company and deleted_at is null
  for update;
  if not found then raise exception 'Capture non trovato'; end if;
  if dc.status <> 'applying' then raise exception 'Capture non in applying'; end if;

  perform public.document_capture_assert_status_transition(dc.status, 'failed');

  update public.document_capture
  set status = 'failed',
      capture_version = capture_version + 1,
      updated_at = now()
  where id = p_capture_id;

  insert into public.document_capture_events (
    company_id, document_capture_id, event_type, idempotency_key, actor_id, payload
  ) values (
    v_company, p_capture_id, 'apply_failed',
    'apply_failed:abort:' || p_application_id::text,
    v_uid,
    jsonb_build_object('applicationId', p_application_id, 'reason', coalesce(p_reason, 'aborted'))
  )
  on conflict (document_capture_id, idempotency_key) do nothing;

  return jsonb_build_object('ok', true, 'status', 'failed');
end;
$$;

revoke all on function public.document_capture_begin_apply(uuid, uuid, boolean) from public;
grant execute on function public.document_capture_begin_apply(uuid, uuid, boolean) to authenticated;
revoke all on function public.document_capture_complete_apply(uuid, uuid, boolean, text, uuid, uuid, jsonb) from public;
grant execute on function public.document_capture_complete_apply(uuid, uuid, boolean, text, uuid, uuid, jsonb) to authenticated;
revoke all on function public.document_capture_abort_apply(uuid, uuid, text) from public;
grant execute on function public.document_capture_abort_apply(uuid, uuid, text) to authenticated;

commit;
