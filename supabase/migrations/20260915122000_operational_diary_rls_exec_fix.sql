-- Fix diario operativo: RLS non può chiamare rbac_user_page_access_level direttamente
-- (revocato da authenticated in 20260909120000). Wrapper SECURITY DEFINER come maintenance_plans.

create or replace function public.rbac_operational_diary_dashboard_read()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_user_page_access_level(public.rbac_auth_uid(), 'dashboard') in ('read', 'write');
$$;

create or replace function public.rbac_operational_diary_dashboard_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_user_page_access_level(public.rbac_auth_uid(), 'dashboard') = 'write';
$$;

revoke all on function public.rbac_operational_diary_dashboard_read() from public;
revoke all on function public.rbac_operational_diary_dashboard_write() from public;
grant execute on function public.rbac_operational_diary_dashboard_read() to authenticated;
grant execute on function public.rbac_operational_diary_dashboard_write() to authenticated;

drop policy if exists cap_operational_diary_select on public.operational_diary_entries;
create policy cap_operational_diary_select on public.operational_diary_entries for select to authenticated
using (
  deleted_at is null
  and public.rbac_operational_diary_dashboard_read()
);

drop policy if exists cap_operational_diary_insert on public.operational_diary_entries;
create policy cap_operational_diary_insert on public.operational_diary_entries for insert to authenticated
with check (
  public.rbac_operational_diary_dashboard_write()
  and created_by = public.rbac_auth_uid()
);

drop policy if exists cap_operational_diary_update on public.operational_diary_entries;
create policy cap_operational_diary_update on public.operational_diary_entries for update to authenticated
using (public.rbac_operational_diary_dashboard_write())
with check (public.rbac_operational_diary_dashboard_write());

comment on function public.rbac_operational_diary_dashboard_read() is
  'RLS diario operativo: lettura se dashboard read o write.';
comment on function public.rbac_operational_diary_dashboard_write() is
  'RLS diario operativo: scrittura/eliminazione logica se dashboard write.';

notify pgrst, 'reload schema';
