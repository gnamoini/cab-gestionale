-- TKB draft singleton: consenti sync operative (mark stale / upsert) agli utenti autenticati.

create policy tkb_draft_insert_authenticated on public.tkb_draft_store
  for insert to authenticated with check (id = 1);

create policy tkb_draft_update_authenticated on public.tkb_draft_store
  for update to authenticated using (id = 1) with check (id = 1);

create policy tkb_snapshots_insert_security on public.tkb_published_snapshots
  for insert to authenticated
  with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));
