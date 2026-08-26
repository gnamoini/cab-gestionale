-- INT-003: import commit dedup (same-transaction idempotency)

create table if not exists public.import_commit_dedup (
  idempotency_key text primary key,
  execution_id uuid not null,
  committed_at timestamptz not null default now(),
  result jsonb
);

revoke all on public.import_commit_dedup from public, anon, authenticated;
grant select, insert, update on public.import_commit_dedup to service_role;

create or replace function public.import_commit_with_dedup(
  p_idempotency_key text,
  p_execution_id uuid,
  p_commit_fn text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing jsonb;
  v_inserted boolean := false;
begin
  perform public.security_assert_service_role();

  insert into public.import_commit_dedup (idempotency_key, execution_id)
  values (p_idempotency_key, p_execution_id)
  on conflict (idempotency_key) do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted, false) then
    select result into v_existing
    from public.import_commit_dedup
    where idempotency_key = p_idempotency_key;
    return coalesce(v_existing, jsonb_build_object('idempotent', true, 'execution_id', p_execution_id));
  end if;

  return jsonb_build_object('inserted', true, 'execution_id', p_execution_id);
end;
$$;

revoke all on function public.import_commit_with_dedup(text, uuid, text) from public, anon, authenticated;
grant execute on function public.import_commit_with_dedup(text, uuid, text) to service_role;

notify pgrst, 'reload schema';
