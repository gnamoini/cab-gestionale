-- Document Capture shared rate limit (Postgres buckets)

begin;

create table if not exists public.document_capture_rate_limit_buckets (
  user_id uuid not null references public.profiles (id) on delete cascade,
  operation text not null,
  bucket_start timestamptz not null,
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint document_capture_rate_limit_op_chk check (
    operation in ('upload_policy', 'analyze', 'apply', 'dry_run')
  ),
  primary key (user_id, operation, bucket_start)
);

create index if not exists idx_document_capture_rate_limit_buckets_created
  on public.document_capture_rate_limit_buckets (created_at);

alter table public.document_capture_rate_limit_buckets enable row level security;

drop policy if exists cap_document_capture_rate_limit_buckets_deny on public.document_capture_rate_limit_buckets;
create policy cap_document_capture_rate_limit_buckets_deny on public.document_capture_rate_limit_buckets
for all to authenticated using (false) with check (false);

create or replace function public.document_capture_rate_limit_check(
  p_operation text,
  p_max integer default 30,
  p_window_seconds integer default 600
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bucket timestamptz;
  v_count integer;
  v_allowed boolean;
begin
  if v_uid is null then raise exception 'Non autenticato'; end if;
  if p_operation not in ('upload_policy', 'analyze', 'apply', 'dry_run') then
    raise exception 'operation non valida';
  end if;

  v_bucket := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.document_capture_rate_limit_buckets (user_id, operation, bucket_start, request_count)
  values (v_uid, p_operation, v_bucket, 1)
  on conflict (user_id, operation, bucket_start)
  do update set request_count = document_capture_rate_limit_buckets.request_count + 1
  returning request_count into v_count;

  v_allowed := v_count <= p_max;

  return jsonb_build_object(
    'allowed', v_allowed,
    'count', v_count,
    'max', p_max,
    'retryAfterSec', case when v_allowed then 0 else p_window_seconds end
  );
end;
$$;

revoke all on function public.document_capture_rate_limit_check(text, integer, integer) from public;
grant execute on function public.document_capture_rate_limit_check(text, integer, integer) to authenticated;

commit;
