-- AI Provider Configuration Store (runtime SSOT for API keys)
-- Access: service role only via Next.js server routes.

create table if not exists public.ai_provider_keys (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('google', 'openai', 'anthropic', 'mistral')),
  slot text not null,
  encrypted_key text not null,
  key_fingerprint text not null,
  enabled boolean not null default true,
  priority int not null default 100,
  weight int not null default 100,
  status text not null default 'healthy' check (
    status in ('healthy', 'degraded', 'rate_limited', 'cooldown', 'invalid', 'disabled')
  ),
  cooldown_until timestamptz,
  requests_total bigint not null default 0,
  success_total bigint not null default 0,
  failure_total bigint not null default 0,
  rate_limit_total bigint not null default 0,
  latency_ms_sum bigint not null default 0,
  latency_ms_count bigint not null default 0,
  last_used_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (provider, slot)
);

create index if not exists ai_provider_keys_provider_enabled_priority_idx
  on public.ai_provider_keys (provider, enabled, priority);

create table if not exists public.ai_provider_key_audit (
  id uuid primary key default gen_random_uuid(),
  key_id uuid references public.ai_provider_keys(id) on delete set null,
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_provider_key_audit_key_id_idx on public.ai_provider_key_audit (key_id);

alter table public.ai_provider_keys enable row level security;
alter table public.ai_provider_key_audit enable row level security;

-- Deny direct client access — server uses service role.
drop policy if exists ai_provider_keys_deny_all on public.ai_provider_keys;
create policy ai_provider_keys_deny_all on public.ai_provider_keys
  for all to authenticated, anon using (false) with check (false);

drop policy if exists ai_provider_key_audit_deny_all on public.ai_provider_key_audit;
create policy ai_provider_key_audit_deny_all on public.ai_provider_key_audit
  for all to authenticated, anon using (false) with check (false);

create or replace function public.ai_provider_key_record_success(p_key_id uuid, p_latency_ms int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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

revoke all on function public.ai_provider_key_record_success(uuid, int) from public;
revoke all on function public.ai_provider_key_record_failure(uuid, text, int) from public;
grant execute on function public.ai_provider_key_record_success(uuid, int) to service_role;
grant execute on function public.ai_provider_key_record_failure(uuid, text, int) to service_role;
