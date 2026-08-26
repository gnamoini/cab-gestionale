-- AI-003: worker lease columns + claim RPC (pg_cron path)

alter table public.ai_part_searches
  add column if not exists lease_owner text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists last_error text;

create or replace function public.ai_part_search_claim_jobs(p_limit integer default 5)
returns setof public.ai_part_searches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner text := coalesce(nullif(current_setting('application_name', true), ''), 'worker');
  v_lease interval := interval '10 minutes';
begin
  perform public.security_assert_service_role();

  return query
  with picked as (
    select s.id
    from public.ai_part_searches s
    where s.status = 'pending'
      and (s.next_retry_at is null or s.next_retry_at <= now())
    order by s.created_at
    for update skip locked
    limit greatest(p_limit, 1)
  )
  update public.ai_part_searches s
  set status = 'processing',
      attempt_count = s.attempt_count + 1,
      lease_owner = v_owner,
      lease_expires_at = now() + v_lease,
      updated_at = now()
  from picked
  where s.id = picked.id
  returning s.*;
end;
$$;

create or replace function public.ai_part_search_reclaim_expired_leases()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.security_assert_service_role();
  update public.ai_part_searches
  set status = 'pending',
      lease_owner = null,
      lease_expires_at = null,
      next_retry_at = now(),
      last_error = coalesce(last_error, 'lease_expired')
  where status = 'processing'
    and lease_expires_at is not null
    and lease_expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.ai_part_search_claim_jobs(integer) from public, anon, authenticated;
grant execute on function public.ai_part_search_claim_jobs(integer) to service_role;

revoke all on function public.ai_part_search_reclaim_expired_leases() from public, anon, authenticated;
grant execute on function public.ai_part_search_reclaim_expired_leases() to service_role;

notify pgrst, 'reload schema';
