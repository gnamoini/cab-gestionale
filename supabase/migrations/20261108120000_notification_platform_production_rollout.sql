-- Production rollout: extended outbox triggers, digest pg_cron, legacy push_delivery_queue removal.

begin;

create extension if not exists pg_net with schema extensions;

-- ── Preventivi ──
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

  if old.stato is distinct from new.stato then
    if new.stato = 'inviato' then
      perform public.cab_enqueue_notification_outbox(
        'preventivi.sent',
        'preventivi',
        new.id,
        'preventivi.sent:preventivi:' || new.id::text,
        new.created_by,
        jsonb_build_object('cliente', new.cliente),
        null
      );
    elsif new.stato = 'annullato' then
      perform public.cab_enqueue_notification_outbox(
        'preventivi.rejected',
        'preventivi',
        new.id,
        'preventivi.rejected:preventivi:' || new.id::text,
        new.created_by,
        jsonb_build_object('cliente', new.cliente),
        null
      );
    elsif new.stato = 'confermato'
          and (old.lavorazione_id is not distinct from new.lavorazione_id) then
      perform public.cab_enqueue_notification_outbox(
        'preventivi.approved',
        'preventivi',
        new.id,
        'preventivi.approved:preventivi:' || new.id::text,
        new.created_by,
        jsonb_build_object('cliente', new.cliente),
        null
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists preventivi_outbox_insert on public.preventivi;
create trigger preventivi_outbox_insert
  after insert on public.preventivi
  for each row
  execute function public.trg_preventivi_outbox();

drop trigger if exists preventivi_outbox_update on public.preventivi;
create trigger preventivi_outbox_update
  after update on public.preventivi
  for each row
  execute function public.trg_preventivi_outbox();

-- ── Lavorazioni: updated / deleted / archived ──
create or replace function public.trg_lavorazioni_outbox_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.deleted_at is distinct from new.deleted_at then
    return new;
  end if;
  if old.archived is distinct from new.archived then
    return new;
  end if;
  if old.stato is distinct from new.stato and new.stato::text = 'completata' then
    return new;
  end if;
  if new.deleted_at is not null then
    return new;
  end if;

  perform public.cab_enqueue_notification_outbox(
    'lavorazioni.updated',
    'lavorazioni',
    new.id,
    'lavorazioni.updated:lavorazioni:' || new.id::text || ':' || floor(extract(epoch from clock_timestamp()))::bigint::text,
    coalesce(new.updated_by, new.created_by),
    jsonb_build_object('prev_stato', old.stato::text, 'curr_stato', new.stato::text),
    null
  );
  return new;
end;
$$;

drop trigger if exists lavorazioni_outbox_updated on public.lavorazioni;
create trigger lavorazioni_outbox_updated
  after update on public.lavorazioni
  for each row
  execute function public.trg_lavorazioni_outbox_updated();

create or replace function public.trg_lavorazioni_outbox_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    perform public.cab_enqueue_notification_outbox(
      'lavorazioni.deleted',
      'lavorazioni',
      new.id,
      'lavorazioni.deleted:lavorazioni:' || new.id::text,
      coalesce(new.updated_by, new.created_by),
      '{}'::jsonb,
      null
    );
  end if;
  return new;
end;
$$;

drop trigger if exists lavorazioni_outbox_deleted on public.lavorazioni;
create trigger lavorazioni_outbox_deleted
  after update of deleted_at on public.lavorazioni
  for each row
  execute function public.trg_lavorazioni_outbox_deleted();

create or replace function public.trg_lavorazioni_outbox_archived()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(old.archived, false) = false and coalesce(new.archived, false) = true then
    perform public.cab_enqueue_notification_outbox(
      'lavorazioni.archived',
      'lavorazioni',
      new.id,
      'lavorazioni.archived:lavorazioni:' || new.id::text,
      coalesce(new.updated_by, new.created_by),
      '{}'::jsonb,
      null
    );
  end if;
  return new;
end;
$$;

drop trigger if exists lavorazioni_outbox_archived on public.lavorazioni;
create trigger lavorazioni_outbox_archived
  after update of archived on public.lavorazioni
  for each row
  execute function public.trg_lavorazioni_outbox_archived();

-- ── Magazzino: movement / part created / part deleted ──
create or replace function public.trg_movimenti_ricambi_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cab_enqueue_notification_outbox(
    'magazzino.movement',
    'movimenti_ricambi',
    new.id,
    'magazzino.movement:movimenti_ricambi:' || new.id::text,
    new.created_by,
    jsonb_build_object('tipo', new.tipo::text, 'ricambio_id', new.ricambio_id),
    null
  );
  return new;
end;
$$;

drop trigger if exists movimenti_ricambi_outbox on public.movimenti_ricambi;
create trigger movimenti_ricambi_outbox
  after insert on public.movimenti_ricambi
  for each row
  execute function public.trg_movimenti_ricambi_outbox();

create or replace function public.trg_magazzino_ricambi_outbox_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cab_enqueue_notification_outbox(
    'magazzino.part_created',
    'magazzino_ricambi',
    new.id,
    'magazzino.part_created:magazzino_ricambi:' || new.id::text,
    null,
    jsonb_build_object('nome', new.nome, 'codice', new.codice),
    null
  );
  return new;
end;
$$;

drop trigger if exists magazzino_ricambi_outbox_created on public.magazzino_ricambi;
create trigger magazzino_ricambi_outbox_created
  after insert on public.magazzino_ricambi
  for each row
  execute function public.trg_magazzino_ricambi_outbox_created();

create or replace function public.trg_magazzino_ricambi_outbox_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cab_enqueue_notification_outbox(
    'magazzino.part_deleted',
    'magazzino_ricambi',
    old.id,
    'magazzino.part_deleted:magazzino_ricambi:' || old.id::text,
    null,
    jsonb_build_object('nome', old.nome, 'codice', old.codice),
    null
  );
  return old;
end;
$$;

drop trigger if exists magazzino_ricambi_outbox_deleted on public.magazzino_ricambi;
create trigger magazzino_ricambi_outbox_deleted
  before delete on public.magazzino_ricambi
  for each row
  execute function public.trg_magazzino_ricambi_outbox_deleted();

-- ── Fatturazione ──
create or replace function public.trg_invoices_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero text;
begin
  v_numero := new.numero::text || '/' || new.anno::text;

  if old.status is distinct from new.status then
    if new.status in ('emessa', 'inviata')
       and old.status not in ('emessa', 'inviata') then
      perform public.cab_enqueue_notification_outbox(
        'fatturazione.invoice_issued',
        'invoices',
        new.id,
        'fatturazione.invoice_issued:invoices:' || new.id::text,
        coalesce(new.updated_by, new.created_by),
        jsonb_build_object('numero', v_numero, 'cliente', new.cliente_label),
        null
      );
    elsif new.status = 'pagata' and old.status is distinct from 'pagata' then
      perform public.cab_enqueue_notification_outbox(
        'fatturazione.invoice_paid',
        'invoices',
        new.id,
        'fatturazione.invoice_paid:invoices:' || new.id::text,
        coalesce(new.updated_by, new.created_by),
        jsonb_build_object('numero', v_numero, 'cliente', new.cliente_label),
        null
      );
    elsif new.status = 'scaduta' and old.status is distinct from 'scaduta' then
      perform public.cab_enqueue_notification_outbox(
        'fatturazione.invoice_overdue',
        'invoices',
        new.id,
        'fatturazione.invoice_overdue:invoices:' || new.id::text,
        coalesce(new.updated_by, new.created_by),
        jsonb_build_object('numero', v_numero, 'cliente', new.cliente_label),
        null
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_outbox on public.invoices;
create trigger invoices_outbox
  after update of status on public.invoices
  for each row
  execute function public.trg_invoices_outbox();

-- ── Mezzi ──
create or replace function public.trg_mezzi_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.cab_enqueue_notification_outbox(
      'mezzi.created',
      'mezzi',
      new.id,
      'mezzi.created:mezzi:' || new.id::text,
      new.created_by,
      jsonb_build_object('label', trim(coalesce(new.marca, '') || ' ' || coalesce(new.modello, ''))),
      null
    );
    return new;
  end if;

  perform public.cab_enqueue_notification_outbox(
    'mezzi.updated',
    'mezzi',
    new.id,
    'mezzi.updated:mezzi:' || new.id::text || ':' || floor(extract(epoch from clock_timestamp()))::bigint::text,
    new.created_by,
    jsonb_build_object('label', trim(coalesce(new.marca, '') || ' ' || coalesce(new.modello, ''))),
    null
  );
  return new;
end;
$$;

drop trigger if exists mezzi_outbox_insert on public.mezzi;
create trigger mezzi_outbox_insert
  after insert on public.mezzi
  for each row
  execute function public.trg_mezzi_outbox();

drop trigger if exists mezzi_outbox_update on public.mezzi;
create trigger mezzi_outbox_update
  after update on public.mezzi
  for each row
  execute function public.trg_mezzi_outbox();

-- ── Clienti anagrafiche ──
create or replace function public.trg_clienti_anagrafiche_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.cab_enqueue_notification_outbox(
      'clienti.created',
      'clienti_anagrafiche',
      new.id,
      'clienti.created:clienti_anagrafiche:' || new.id::text,
      new.updated_by,
      jsonb_build_object('label', new.nome_display),
      null
    );
    return new;
  end if;

  perform public.cab_enqueue_notification_outbox(
    'clienti.updated',
    'clienti_anagrafiche',
    new.id,
    'clienti.updated:clienti_anagrafiche:' || new.id::text || ':' || floor(extract(epoch from clock_timestamp()))::bigint::text,
    new.updated_by,
    jsonb_build_object('label', new.nome_display),
    null
  );
  return new;
end;
$$;

drop trigger if exists clienti_anagrafiche_outbox_insert on public.clienti_anagrafiche;
create trigger clienti_anagrafiche_outbox_insert
  after insert on public.clienti_anagrafiche
  for each row
  execute function public.trg_clienti_anagrafiche_outbox();

drop trigger if exists clienti_anagrafiche_outbox_update on public.clienti_anagrafiche;
create trigger clienti_anagrafiche_outbox_update
  after update on public.clienti_anagrafiche
  for each row
  execute function public.trg_clienti_anagrafiche_outbox();

-- ── Attrezzature ──
create or replace function public.trg_attrezzature_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.cab_enqueue_notification_outbox(
      'attrezzature.created',
      'attrezzature',
      new.id,
      'attrezzature.created:attrezzature:' || new.id::text,
      new.created_by,
      jsonb_build_object('label', trim(coalesce(new.marca, '') || ' ' || coalesce(new.modello, ''))),
      null
    );
    return new;
  end if;

  perform public.cab_enqueue_notification_outbox(
    'attrezzature.updated',
    'attrezzature',
    new.id,
    'attrezzature.updated:attrezzature:' || new.id::text || ':' || floor(extract(epoch from clock_timestamp()))::bigint::text,
    new.created_by,
    jsonb_build_object('label', trim(coalesce(new.marca, '') || ' ' || coalesce(new.modello, ''))),
    null
  );
  return new;
end;
$$;

drop trigger if exists attrezzature_outbox_insert on public.attrezzature;
create trigger attrezzature_outbox_insert
  after insert on public.attrezzature
  for each row
  execute function public.trg_attrezzature_outbox();

drop trigger if exists attrezzature_outbox_update on public.attrezzature;
create trigger attrezzature_outbox_update
  after update on public.attrezzature
  for each row
  execute function public.trg_attrezzature_outbox();

-- ── Documenti ──
create or replace function public.trg_documenti_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.cab_enqueue_notification_outbox(
      'documenti.created',
      'documenti',
      new.id,
      'documenti.created:documenti:' || new.id::text,
      new.uploaded_by,
      jsonb_build_object('label', coalesce(new.nome_file, new.marca)),
      null
    );
    return new;
  end if;

  perform public.cab_enqueue_notification_outbox(
    'documenti.updated',
    'documenti',
    new.id,
    'documenti.updated:documenti:' || new.id::text || ':' || floor(extract(epoch from clock_timestamp()))::bigint::text,
    new.uploaded_by,
    jsonb_build_object('label', coalesce(new.nome_file, new.marca)),
    null
  );
  return new;
end;
$$;

drop trigger if exists documenti_outbox_insert on public.documenti;
create trigger documenti_outbox_insert
  after insert on public.documenti
  for each row
  execute function public.trg_documenti_outbox();

drop trigger if exists documenti_outbox_update on public.documenti;
create trigger documenti_outbox_update
  after update on public.documenti
  for each row
  execute function public.trg_documenti_outbox();

-- ── Ordini fornitori ──
create or replace function public.trg_ordini_fornitori_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.cab_enqueue_notification_outbox(
      'ordini.created',
      'ordini_fornitori',
      new.id,
      'ordini.created:ordini_fornitori:' || new.id::text,
      new.created_by,
      jsonb_build_object('label', new.fornitore_label, 'numero', new.numero),
      null
    );
    return new;
  end if;

  perform public.cab_enqueue_notification_outbox(
    'ordini.updated',
    'ordini_fornitori',
    new.id,
    'ordini.updated:ordini_fornitori:' || new.id::text || ':' || floor(extract(epoch from clock_timestamp()))::bigint::text,
    coalesce(new.updated_by, new.created_by),
    jsonb_build_object('label', new.fornitore_label, 'status', new.status),
    null
  );
  return new;
end;
$$;

drop trigger if exists ordini_fornitori_outbox_insert on public.ordini_fornitori;
create trigger ordini_fornitori_outbox_insert
  after insert on public.ordini_fornitori
  for each row
  execute function public.trg_ordini_fornitori_outbox();

drop trigger if exists ordini_fornitori_outbox_update on public.ordini_fornitori;
create trigger ordini_fornitori_outbox_update
  after update on public.ordini_fornitori
  for each row
  execute function public.trg_ordini_fornitori_outbox();

-- ── Cron invoke helpers (digest + push cleanup) ──
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

revoke all on function public.cab_invoke_fatturazione_overdue_digest_worker() from public;
grant execute on function public.cab_invoke_fatturazione_overdue_digest_worker() to service_role;

revoke all on function public.cab_invoke_lavorazioni_overdue_digest_worker() from public;
grant execute on function public.cab_invoke_lavorazioni_overdue_digest_worker() to service_role;

revoke all on function public.cab_invoke_push_subscription_cleanup_worker() from public;
grant execute on function public.cab_invoke_push_subscription_cleanup_worker() to service_role;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'fatturazione-overdue-digest-daily';
    perform cron.schedule(
      'fatturazione-overdue-digest-daily',
      '0 7 * * *',
      $cron$select public.cab_invoke_fatturazione_overdue_digest_worker();$cron$
    );

    perform cron.unschedule(jobid) from cron.job where jobname = 'lavorazioni-overdue-digest-daily';
    perform cron.schedule(
      'lavorazioni-overdue-digest-daily',
      '0 6 * * *',
      $cron$select public.cab_invoke_lavorazioni_overdue_digest_worker();$cron$
    );

    perform cron.unschedule(jobid) from cron.job where jobname = 'push-subscription-cleanup-weekly';
    perform cron.schedule(
      'push-subscription-cleanup-weekly',
      '0 3 * * 0',
      $cron$select public.cab_invoke_push_subscription_cleanup_worker();$cron$
    );
  end if;
exception when others then
  null;
end;
$do$;

-- ── Legacy push_delivery_queue removal (SSOT: delivery_queue + Vercel worker) ──
do $do$
begin
  if to_regclass('public.push_delivery_queue') is not null then
    drop trigger if exists push_delivery_queue_invoke_worker on public.push_delivery_queue;
  end if;
end;
$do$;

drop trigger if exists notifications_enqueue_push_delivery on public.notifications;

drop function if exists public.trg_push_delivery_queue_invoke_worker();
drop function if exists public.trg_notifications_enqueue_push_delivery();
drop function if exists public.cab_enqueue_push_delivery(uuid);
drop function if exists public.cab_claim_push_delivery_batch(int);
drop function if exists public.cab_complete_push_delivery(uuid, boolean, text, int);

drop table if exists public.push_delivery_queue;

-- cab_invoke_push_delivery_worker: retained for delivery_queue insert trigger (SSOT v4 worker)

comment on function public.cab_invoke_fatturazione_overdue_digest_worker() is
  'Digest giornaliero fatture scadute via Vercel cron API.';
comment on function public.cab_invoke_lavorazioni_overdue_digest_worker() is
  'Digest giornaliero lavorazioni in ritardo via Vercel cron API.';
comment on function public.cab_invoke_push_subscription_cleanup_worker() is
  'Pulizia subscription push stale via Vercel cron API.';

commit;
