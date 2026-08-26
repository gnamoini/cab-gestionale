-- Security remediation v2 (SEC-09, SEC-08): operative history + TKB draft/snapshots staff-only.

-- Operative history (Description Engine contextual ranking — NOT TKB)
drop policy if exists ohc_read_authenticated on public.operative_history_cases;
drop policy if exists ohs_read_authenticated on public.operative_history_signals;

create policy ohc_read_staff on public.operative_history_cases
  for select to authenticated
  using (
    not public.rbac_is_cliente()
    and public.rbac_is_operatore_or_admin()
  );

create policy ohs_read_staff on public.operative_history_signals
  for select to authenticated
  using (
    not public.rbac_is_cliente()
    and public.rbac_is_operatore_or_admin()
  );

-- TKB draft store: staff read, security admin write
drop policy if exists tkb_draft_read_authenticated on public.tkb_draft_store;
drop policy if exists tkb_draft_insert_authenticated on public.tkb_draft_store;
drop policy if exists tkb_draft_update_authenticated on public.tkb_draft_store;

create policy tkb_draft_read_staff on public.tkb_draft_store
  for select to authenticated
  using (
    not public.rbac_is_cliente()
    and public.rbac_is_operatore_or_admin()
  );

create policy tkb_draft_write_security on public.tkb_draft_store
  for all to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
  with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

-- TKB published snapshots: staff read only
drop policy if exists tkb_snapshots_read_authenticated on public.tkb_published_snapshots;

create policy tkb_snapshots_read_staff on public.tkb_published_snapshots
  for select to authenticated
  using (
    not public.rbac_is_cliente()
    and public.rbac_is_operatore_or_admin()
  );

notify pgrst, 'reload schema';
