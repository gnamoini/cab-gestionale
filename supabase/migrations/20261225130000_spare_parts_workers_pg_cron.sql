-- Spare parts AI workers via pg_cron + pg_net (Vercel Hobby: no */5 or * * * * * vercel.json crons).

begin;

create extension if not exists pg_net with schema extensions;

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

revoke all on function public.cab_invoke_spare_parts_document_index_worker() from public;
grant execute on function public.cab_invoke_spare_parts_document_index_worker() to service_role;

revoke all on function public.cab_invoke_spare_parts_part_search_worker() from public;
grant execute on function public.cab_invoke_spare_parts_part_search_worker() to service_role;

create or replace function public.trg_document_ai_index_invoke_worker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' and new.is_active then
    perform public.cab_invoke_spare_parts_document_index_worker();
  end if;
  return new;
end;
$$;

drop trigger if exists document_ai_index_invoke_worker on public.document_ai_index;
create trigger document_ai_index_invoke_worker
  after insert on public.document_ai_index
  for each row
  execute function public.trg_document_ai_index_invoke_worker();

create or replace function public.trg_ai_part_searches_invoke_worker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.cab_invoke_spare_parts_part_search_worker();
  end if;
  return new;
end;
$$;

drop trigger if exists ai_part_searches_invoke_worker on public.ai_part_searches;
create trigger ai_part_searches_invoke_worker
  after insert or update of status on public.ai_part_searches
  for each row
  execute function public.trg_ai_part_searches_invoke_worker();

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'spare-parts-document-index-poll';
    perform cron.schedule(
      'spare-parts-document-index-poll',
      '*/2 * * * *',
      $cron$select public.cab_invoke_spare_parts_document_index_worker();$cron$
    );
    perform cron.unschedule(jobid) from cron.job where jobname = 'spare-parts-part-search-poll';
    perform cron.schedule(
      'spare-parts-part-search-poll',
      '*/2 * * * *',
      $cron$select public.cab_invoke_spare_parts_part_search_worker();$cron$
    );
  end if;
exception when others then
  null;
end;
$do$;

commit;
