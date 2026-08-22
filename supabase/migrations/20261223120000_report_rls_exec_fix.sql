-- report_runs / report_decision_points: RLS non può chiamare rbac_user_page_access_level
-- direttamente (revocato da authenticated in 20260909120000). Wrapper SECURITY DEFINER.

create or replace function public.rbac_report_page_read()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_user_page_access_level(public.rbac_auth_uid(), 'report') in ('read', 'write');
$$;

create or replace function public.rbac_report_page_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_user_page_access_level(public.rbac_auth_uid(), 'report') = 'write';
$$;

revoke all on function public.rbac_report_page_read() from public;
revoke all on function public.rbac_report_page_write() from public;
grant execute on function public.rbac_report_page_read() to authenticated;
grant execute on function public.rbac_report_page_write() to authenticated;

-- report_runs
drop policy if exists cap_report_runs_select on public.report_runs;
create policy cap_report_runs_select on public.report_runs for select to authenticated
using (public.rbac_report_page_read());

drop policy if exists cap_report_runs_insert on public.report_runs;
create policy cap_report_runs_insert on public.report_runs for insert to authenticated
with check (public.rbac_report_page_read());

drop policy if exists cap_report_runs_update on public.report_runs;
create policy cap_report_runs_update on public.report_runs for update to authenticated
using (public.rbac_report_page_write())
with check (public.rbac_report_page_write());

-- report_decision_points
drop policy if exists cap_report_decision_points_select on public.report_decision_points;
create policy cap_report_decision_points_select on public.report_decision_points for select to authenticated
using (public.rbac_report_page_read());

drop policy if exists cap_report_decision_points_insert on public.report_decision_points;
create policy cap_report_decision_points_insert on public.report_decision_points for insert to authenticated
with check (public.rbac_report_page_read());

drop policy if exists cap_report_decision_points_update on public.report_decision_points;
create policy cap_report_decision_points_update on public.report_decision_points for update to authenticated
using (public.rbac_report_page_write())
with check (public.rbac_report_page_write());

comment on function public.rbac_report_page_read() is
  'RLS report: lettura/inserimento se report read o write.';
comment on function public.rbac_report_page_write() is
  'RLS report: update se report write.';

notify pgrst, 'reload schema';
