-- Log eventi autenticazione (login, logout, login_failed).
-- Inserimenti da client: login/logout solo con sessione valida; login_failed anche anon.

create table if not exists public.auth_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email text not null default '',
  action text not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint auth_logs_action_chk check (action in ('login', 'logout', 'login_failed'))
);

create index if not exists idx_auth_logs_user_created on public.auth_logs (user_id, created_at desc);
create index if not exists idx_auth_logs_created on public.auth_logs (created_at desc);

comment on table public.auth_logs is 'Tracciamento auth: inserimenti da client (fire-and-forget); lettura RLS.';

alter table public.auth_logs enable row level security;

drop policy if exists auth_logs_select on public.auth_logs;
create policy auth_logs_select
on public.auth_logs for select to authenticated
using (
  public.current_profile_role() = 'admin'
  or (user_id is not null and user_id = auth.uid())
);

drop policy if exists auth_logs_insert_login on public.auth_logs;
create policy auth_logs_insert_login
on public.auth_logs for insert to authenticated
with check (action = 'login' and user_id = auth.uid());

drop policy if exists auth_logs_insert_logout on public.auth_logs;
create policy auth_logs_insert_logout
on public.auth_logs for insert to authenticated
with check (action = 'logout' and user_id = auth.uid());

drop policy if exists auth_logs_insert_failed_anon on public.auth_logs;
create policy auth_logs_insert_failed_anon
on public.auth_logs for insert to anon
with check (action = 'login_failed' and user_id is null);

drop policy if exists auth_logs_insert_failed_auth on public.auth_logs;
create policy auth_logs_insert_failed_auth
on public.auth_logs for insert to authenticated
with check (action = 'login_failed' and user_id is null);

revoke all on table public.auth_logs from public;
revoke all on table public.auth_logs from anon;
grant select on table public.auth_logs to authenticated;
grant insert on table public.auth_logs to authenticated;
grant insert on table public.auth_logs to anon;
