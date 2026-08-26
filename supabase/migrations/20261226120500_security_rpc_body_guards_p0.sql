-- Security remediation v2: RPC body guards (P0) — prepend auth/service_role checks.

-- ---------------------------------------------------------------------------
-- import_files lifecycle (service_role + TTL floor)
-- ---------------------------------------------------------------------------
create or replace function public.expire_import_files(
  p_uploaded_ttl interval default interval '24 hours',
  p_processed_ttl interval default interval '24 hours',
  p_failed_ttl interval default interval '7 days'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
  v_path text;
begin
  perform public.security_assert_service_role();

  if p_uploaded_ttl < interval '1 hour'
     or p_processed_ttl < interval '1 hour'
     or p_failed_ttl < interval '1 hour' then
    raise exception 'TTL minimo: interval ''1 hour''' using errcode = '22023';
  end if;

  for r in
    select id, storage_path, status, created_at, processed_at, cancelled_at, expires_at
    from public.import_files
    where status in ('uploaded', 'cancelled', 'processed', 'failed')
      and (
        (status in ('uploaded', 'cancelled') and coalesce(cancelled_at, created_at) < now() - p_uploaded_ttl)
        or (status = 'processed' and processed_at is not null and processed_at < now() - p_processed_ttl)
        or (status = 'failed' and updated_at < now() - p_failed_ttl)
        or expires_at < now()
      )
    for update skip locked
  loop
    v_path := r.storage_path;

    update public.import_files
    set status = 'expired',
        expired_at = now(),
        storage_path = null,
        storage_cleanup_status = case when v_path is not null then 'pending' else storage_cleanup_status end,
        meta = case
          when v_path is not null then jsonb_set(coalesce(meta, '{}'::jsonb), '{storage_path_at_expire}', to_jsonb(v_path))
          else meta
        end,
        updated_at = now()
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.cleanup_import_storage(p_batch_size integer default 100)
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_count integer := 0;
  r record;
  v_path text;
begin
  perform public.security_assert_service_role();

  for r in
    select id, meta
    from public.import_files
    where storage_cleanup_status = 'pending'
      and meta ? 'storage_path_at_expire'
    order by updated_at
    limit p_batch_size
    for update skip locked
  loop
    v_path := r.meta->>'storage_path_at_expire';
    if v_path is null or length(trim(v_path)) = 0 then
      update public.import_files
      set storage_cleanup_status = 'deleted', updated_at = now()
      where id = r.id;
      v_count := v_count + 1;
      continue;
    end if;

    begin
      delete from storage.objects
      where bucket_id = 'import-sources' and name = v_path;

      update public.import_files
      set storage_cleanup_status = 'deleted',
          updated_at = now()
      where id = r.id;
      v_count := v_count + 1;
    exception when others then
      update public.import_files
      set storage_cleanup_status = 'failed',
          meta = jsonb_set(coalesce(meta, '{}'::jsonb), '{storage_cleanup_error}', to_jsonb(SQLERRM)),
          updated_at = now()
      where id = r.id;
    end;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- cab_invoke_* workers (service_role)
-- ---------------------------------------------------------------------------
create or replace function public.cab_invoke_notification_outbox_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_url text := coalesce(
    nullif(current_setting('app.notification_outbox_worker_url', true), ''),
    'https://cab-gestionale.vercel.app/api/cron/notification-outbox-processor'
  );
begin
  perform public.security_assert_service_role();

  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  where ds.name = 'push_delivery_cron_secret'
  limit 1;

  if v_secret is null or char_length(trim(v_secret)) < 8 then
    insert into public.notification_worker_diagnostics (worker_name, status, detail)
    values ('notification_outbox', 'skipped', 'push_delivery_cron_secret missing or too short');
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(v_secret)
    ),
    body := '{}'::jsonb
  );

  insert into public.notification_worker_diagnostics (worker_name, status, detail)
  values ('notification_outbox', 'ok', 'invoke requested');
exception when others then
  insert into public.notification_worker_diagnostics (worker_name, status, detail)
  values ('notification_outbox', 'error', left(SQLERRM, 500));
  raise;
end;
$$;

create or replace function public.cab_invoke_push_delivery_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_url text := coalesce(
    nullif(current_setting('app.push_delivery_worker_url', true), ''),
    'https://cab-gestionale.vercel.app/api/cron/push-delivery'
  );
begin
  perform public.security_assert_service_role();

  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  where ds.name = 'push_delivery_cron_secret'
  limit 1;

  if v_secret is null or char_length(trim(v_secret)) < 8 then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(v_secret)
    ),
    body := '{}'::jsonb
  );
end;
$$;

create or replace function public.cab_invoke_fatturazione_overdue_digest_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_url text := coalesce(
    nullif(current_setting('app.fatturazione_overdue_digest_url', true), ''),
    'https://cab-gestionale.vercel.app/api/cron/fatturazione-overdue-digest'
  );
begin
  perform public.security_assert_service_role();

  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  where ds.name = 'push_delivery_cron_secret'
  limit 1;

  if v_secret is null or char_length(trim(v_secret)) < 8 then
    insert into public.notification_worker_diagnostics (worker_name, status, detail)
    values ('fatturazione_overdue_digest', 'skipped', 'push_delivery_cron_secret missing');
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(v_secret)
    ),
    body := '{}'::jsonb
  );
end;
$$;

create or replace function public.cab_invoke_lavorazioni_overdue_digest_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_url text := coalesce(
    nullif(current_setting('app.lavorazioni_overdue_digest_url', true), ''),
    'https://cab-gestionale.vercel.app/api/cron/lavorazioni-overdue-digest'
  );
begin
  perform public.security_assert_service_role();

  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  where ds.name = 'push_delivery_cron_secret'
  limit 1;

  if v_secret is null or char_length(trim(v_secret)) < 8 then
    insert into public.notification_worker_diagnostics (worker_name, status, detail)
    values ('lavorazioni_overdue_digest', 'skipped', 'push_delivery_cron_secret missing');
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(v_secret)
    ),
    body := '{}'::jsonb
  );
end;
$$;

create or replace function public.cab_invoke_push_subscription_cleanup_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_url text := coalesce(
    nullif(current_setting('app.push_subscription_cleanup_url', true), ''),
    'https://cab-gestionale.vercel.app/api/cron/push-subscription-cleanup'
  );
begin
  perform public.security_assert_service_role();

  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  where ds.name = 'push_delivery_cron_secret'
  limit 1;

  if v_secret is null or char_length(trim(v_secret)) < 8 then
    insert into public.notification_worker_diagnostics (worker_name, status, detail)
    values ('push_subscription_cleanup', 'skipped', 'push_delivery_cron_secret missing');
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(v_secret)
    ),
    body := '{}'::jsonb
  );
end;
$$;

create or replace function public.cab_invoke_communication_outbox_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_url text := coalesce(
    nullif(current_setting('app.communication_outbox_worker_url', true), ''),
    'https://cab-gestionale.vercel.app/api/cron/communication-outbox-processor'
  );
begin
  perform public.security_assert_service_role();

  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  where ds.name = 'push_delivery_cron_secret'
  limit 1;

  if v_secret is null or char_length(trim(v_secret)) < 8 then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(v_secret)
    ),
    body := '{}'::jsonb
  );
exception when others then
  raise;
end;
$$;

create or replace function public.cab_invoke_communication_send_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_url text := coalesce(
    nullif(current_setting('app.communication_send_worker_url', true), ''),
    'https://cab-gestionale.vercel.app/api/cron/communication-send-worker'
  );
begin
  perform public.security_assert_service_role();

  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  where ds.name = 'push_delivery_cron_secret'
  limit 1;

  if v_secret is null or char_length(trim(v_secret)) < 8 then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(v_secret)
    ),
    body := '{}'::jsonb
  );
exception when others then
  raise;
end;
$$;

create or replace function public.cab_invoke_spare_parts_document_index_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_url text := coalesce(
    nullif(current_setting('app.spare_parts_document_index_worker_url', true), ''),
    'https://cab-gestionale.vercel.app/api/cron/spare-parts-document-index-queue'
  );
begin
  perform public.security_assert_service_role();

  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  where ds.name = 'push_delivery_cron_secret'
  limit 1;

  if v_secret is null or char_length(trim(v_secret)) < 8 then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(v_secret)
    ),
    body := '{}'::jsonb
  );
exception when others then
  raise;
end;
$$;

create or replace function public.cab_invoke_spare_parts_part_search_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_url text := coalesce(
    nullif(current_setting('app.spare_parts_part_search_worker_url', true), ''),
    'https://cab-gestionale.vercel.app/api/cron/spare-parts-part-search-queue'
  );
begin
  perform public.security_assert_service_role();

  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  where ds.name = 'push_delivery_cron_secret'
  limit 1;

  if v_secret is null or char_length(trim(v_secret)) < 8 then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(v_secret)
    ),
    body := '{}'::jsonb
  );
exception when others then
  raise;
end;
$$;

-- ---------------------------------------------------------------------------
-- ai_provider_key_record_* (service_role)
-- ---------------------------------------------------------------------------
create or replace function public.ai_provider_key_record_success(p_key_id uuid, p_latency_ms int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.security_assert_service_role();

  update public.ai_provider_keys
  set
    requests_total = requests_total + 1,
    success_total = success_total + 1,
    latency_ms_sum = latency_ms_sum + greatest(p_latency_ms, 0),
    latency_ms_count = latency_ms_count + 1,
    last_used_at = now(),
    last_success_at = now(),
    status = case when status in ('cooldown', 'rate_limited', 'degraded') then 'healthy' else status end,
    cooldown_until = null,
    updated_at = now()
  where id = p_key_id;
end;
$$;

create or replace function public.ai_provider_key_record_failure(
  p_key_id uuid,
  p_error_code text,
  p_cooldown_seconds int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  perform public.security_assert_service_role();

  v_status := case
    when p_error_code = 'AI_KEY_INVALID' then 'invalid'
    when p_error_code in ('AI_RATE_LIMIT', 'AI_QUOTA_EXCEEDED') then 'cooldown'
    else 'degraded'
  end;

  update public.ai_provider_keys
  set
    requests_total = requests_total + 1,
    failure_total = failure_total + 1,
    rate_limit_total = rate_limit_total + case when p_error_code in ('AI_RATE_LIMIT', 'AI_QUOTA_EXCEEDED') then 1 else 0 end,
    last_used_at = now(),
    last_failure_at = now(),
    last_error = left(coalesce(p_error_code, 'unknown'), 500),
    status = v_status,
    cooldown_until = case
      when p_cooldown_seconds is not null then now() + make_interval(secs => p_cooldown_seconds)
      else cooldown_until
    end,
    updated_at = now()
  where id = p_key_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- cab_publish_notification (staff inbox + actor binding)
-- ---------------------------------------------------------------------------
create or replace function public.cab_publish_notification(
  p_type text,
  p_title text,
  p_body text,
  p_href text default null,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_dedup_key text default null,
  p_idempotency_key text default null,
  p_translation_key text default null,
  p_translation_params jsonb default '{}'::jsonb,
  p_snapshot jsonb default '{}'::jsonb,
  p_actions jsonb default '[]'::jsonb,
  p_payload_version text default 'v1',
  p_expires_at timestamptz default null,
  p_source_domain_event text default null,
  p_actor_id uuid default null,
  p_priority text default null
)
returns table (id uuid, inserted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result record;
begin
  perform public.security_assert_authenticated();
  if not public.notification_staff_inbox_eligible() then
    raise exception 'ERR_INBOX_NOT_ALLOWED' using errcode = '42501';
  end if;
  p_actor_id := auth.uid();

  select * into v_result from public.cab_create_notification(
    p_type, p_title, p_body, p_href, p_entity_type, p_entity_id, p_dedup_key
  ) as t(id, inserted);

  if v_result.id is null then
    return query select null::uuid, false;
  end if;

  if v_result.inserted then
    update public.notifications n set
      status = 'CREATED',
      status_changed_at = now(),
      idempotency_key = coalesce(nullif(trim(p_idempotency_key), ''), n.idempotency_key),
      translation_key = coalesce(nullif(trim(p_translation_key), ''), n.translation_key),
      translation_params = coalesce(p_translation_params, n.translation_params),
      snapshot = coalesce(p_snapshot, n.snapshot),
      actions = coalesce(p_actions, n.actions),
      payload_version = coalesce(nullif(trim(p_payload_version), ''), n.payload_version),
      expires_at = coalesce(p_expires_at, n.expires_at),
      source_domain_event = coalesce(nullif(trim(p_source_domain_event), ''), n.source_domain_event),
      actor_id = coalesce(p_actor_id, n.actor_id),
      priority = coalesce(nullif(trim(p_priority), ''), n.priority)
    where n.id = v_result.id;
    perform public.cab_enqueue_raw_delivery(v_result.id);
  end if;

  return query select v_result.id, v_result.inserted;
end;
$$;

-- ---------------------------------------------------------------------------
-- preventivi / fatturazione event RPC
-- ---------------------------------------------------------------------------
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
  perform public.security_assert_authenticated();
  if not public.rbac_module_can('preventivi', 'write') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

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

create or replace function public.invoice_insert_event(
  p_entity_type text,
  p_entity_id uuid,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_invoice_id uuid,
  p_event_category text,
  p_event_type text,
  p_correlation_id uuid,
  p_causation_id uuid,
  p_payload jsonb,
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.security_assert_authenticated();
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  insert into public.invoice_events (
    entity_type, entity_id, aggregate_type, aggregate_id, invoice_id,
    event_category, event_type, correlation_id, causation_id, payload, actor_id
  )
  values (
    p_entity_type, p_entity_id, p_aggregate_type, p_aggregate_id, p_invoice_id,
    p_event_category, p_event_type, p_correlation_id, p_causation_id, coalesce(p_payload, '{}'::jsonb), p_actor_id
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- settings rename jobs (security admin)
-- ---------------------------------------------------------------------------
create or replace function public.execute_rename_job_start(p_job_id uuid, p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.settings_rename_jobs%rowtype;
begin
  perform public.security_assert_authenticated();
  if not public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  select * into v_job from public.settings_rename_jobs where id = p_job_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'job_not_found');
  end if;
  if v_job.status not in ('approved', 'queued') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status', 'status', v_job.status);
  end if;
  update public.settings_rename_jobs
    set status = 'running', created_by = coalesce(p_actor, created_by)
    where id = p_job_id;
  return jsonb_build_object('ok', true, 'job_id', p_job_id, 'kind', v_job.kind);
end;
$$;

create or replace function public.execute_rename_job_complete(
  p_job_id uuid,
  p_metrics jsonb,
  p_health jsonb,
  p_entity_snapshot jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.security_assert_authenticated();
  if not public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  update public.settings_rename_jobs
    set
      status = 'completed',
      completed_at = now(),
      metrics_json = p_metrics,
      health_json = p_health,
      entity_snapshot = coalesce(p_entity_snapshot, entity_snapshot)
    where id = p_job_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- log_modifiche retention (cron dashboard; per_entity is trigger-internal — no guard)
-- ---------------------------------------------------------------------------
create or replace function public.prune_log_modifiche_dashboard_window()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg jsonb;
  days_keep int;
  max_rows int;
  cutoff timestamptz;
begin
  perform public.security_assert_service_role();

  cfg := public.get_audit_retention_config();
  days_keep := coalesce((cfg->>'dashboard_days')::int, 90);
  max_rows := coalesce((cfg->>'dashboard_max_rows')::int, 10000);
  cutoff := now() - make_interval(days => days_keep);

  delete from public.log_modifiche lm
  where lm.created_at < cutoff
    and lm.id not in (
      select sub.id
      from (
        select id
        from public.log_modifiche
        order by created_at desc
        limit max_rows
      ) sub
    );
end;
$$;

-- ponytail: prune_log_modifiche_per_entity runs as AFTER INSERT trigger — service_role guard would break writes.

-- ---------------------------------------------------------------------------
-- fatturazione reconciliation reports (read)
-- ---------------------------------------------------------------------------
create or replace function public.invoice_legacy_status_audit_report()
returns table (
  invoice_id uuid,
  status text,
  derived text,
  mismatch boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.security_assert_authenticated();
  if not public.rbac_module_can('fatturazione', 'read') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  return query
  select
    i.id as invoice_id,
    i.status,
    public.invoice_derive_legacy_status(
      i.document_status,
      i.payment_status,
      i.sent_to_customer_at,
      i.data_scadenza
    ) as derived,
    i.status is distinct from public.invoice_derive_legacy_status(
      i.document_status,
      i.payment_status,
      i.sent_to_customer_at,
      i.data_scadenza
    ) as mismatch
  from public.invoices i
  where i.status is distinct from public.invoice_derive_legacy_status(
    i.document_status,
    i.payment_status,
    i.sent_to_customer_at,
    i.data_scadenza
  );
end;
$$;

create or replace function public.invoice_payment_reconciliation_report()
returns table (
  invoice_id uuid,
  totale numeric,
  pagato numeric,
  residuo numeric,
  open_item_remaining numeric,
  allocations_sum numeric,
  mismatch boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.security_assert_authenticated();
  if not public.rbac_module_can('fatturazione', 'read') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  return query
  select
    i.id as invoice_id,
    i.totale,
    i.pagato,
    i.residuo,
    coi.remaining_signed as open_item_remaining,
    coalesce(alloc.s, 0) as allocations_sum,
    (
      abs(i.totale - (i.pagato + i.residuo)) > 0.02
      or (coi.id is not null and abs(abs(coi.remaining_signed) - i.residuo) > 0.02)
      or (coi.id is not null and coalesce(alloc.s, 0) > 0 and abs(coalesce(alloc.s, 0) - i.pagato) > 0.02)
    ) as mismatch
  from public.invoices i
  left join public.customer_open_items coi on coi.invoice_id = i.id and coi.source_type = 'invoice'
  left join lateral (
    select sum(pa.amount) as s
    from public.payment_allocations pa
    join public.customer_payments cp on cp.id = pa.payment_id
    join public.customer_open_items oi on oi.id = pa.open_item_id
    where oi.invoice_id = i.id
  ) alloc on true
  where coalesce(i.document_status, i.status) = 'emessa'
    and i.status <> 'annullata';
end;
$$;

create or replace function public.customer_balance_reconciliation_report()
returns table (
  customer_id uuid,
  open_items_sum numeric,
  invoice_debits numeric,
  credit_notes numeric,
  advances numeric,
  accounting_balance numeric,
  mismatch boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.security_assert_authenticated();
  if not public.rbac_module_can('fatturazione', 'read') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  return query
  select
    coi.customer_id,
    sum(coi.remaining_signed) as open_items_sum,
    sum(coi.remaining_signed) filter (where coi.source_type = 'invoice') as invoice_debits,
    sum(coi.remaining_signed) filter (where coi.source_type = 'credit_note') as credit_notes,
    sum(coi.remaining_signed) filter (where coi.source_type = 'customer_advance') as advances,
    coalesce(sum(coi.remaining_signed) filter (where coi.source_type = 'invoice'), 0)
      + coalesce(sum(coi.remaining_signed) filter (where coi.source_type = 'credit_note'), 0)
      + coalesce(sum(coi.remaining_signed) filter (where coi.source_type = 'customer_advance'), 0) as accounting_balance,
    false as mismatch
  from public.customer_open_items coi
  where coi.customer_id is not null
    and coi.status <> 'closed'
  group by coi.customer_id;
end;
$$;

create or replace function public.invoice_status_migration_report()
returns table (
  invoice_id uuid,
  numero integer,
  anno integer,
  old_status text,
  new_document_status text,
  new_payment_status text,
  note text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.security_assert_authenticated();
  if not public.rbac_module_can('fatturazione', 'read') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  return query
  select
    i.id,
    i.numero,
    i.anno,
    i.status as old_status,
    m.new_document_status,
    m.new_payment_status,
    case
      when i.status = 'inviata' then 'sent_to_customer_at will be set'
      else null
    end as note
  from public.invoices i
  cross join lateral public.invoice_map_legacy_to_axes(i.status) m
  order by i.anno desc, i.numero desc;
end;
$$;

notify pgrst, 'reload schema';
