-- Diario operativo: permessi legati alla pagina dashboard (read = leggere tutte, write = scrivere/eliminare tutte).

drop policy if exists cap_operational_diary_select on public.operational_diary_entries;
create policy cap_operational_diary_select on public.operational_diary_entries for select to authenticated
using (
  deleted_at is null
  and public.rbac_user_page_access_level(public.rbac_auth_uid(), 'dashboard') in ('read', 'write')
);

drop policy if exists cap_operational_diary_insert on public.operational_diary_entries;
create policy cap_operational_diary_insert on public.operational_diary_entries for insert to authenticated
with check (
  public.rbac_user_page_access_level(public.rbac_auth_uid(), 'dashboard') = 'write'
  and created_by = public.rbac_auth_uid()
);

drop policy if exists cap_operational_diary_update on public.operational_diary_entries;
create policy cap_operational_diary_update on public.operational_diary_entries for update to authenticated
using (public.rbac_user_page_access_level(public.rbac_auth_uid(), 'dashboard') = 'write')
with check (public.rbac_user_page_access_level(public.rbac_auth_uid(), 'dashboard') = 'write');

comment on policy cap_operational_diary_select on public.operational_diary_entries is
  'Lettura note condivise: accesso read o write alla pagina dashboard.';
comment on policy cap_operational_diary_insert on public.operational_diary_entries is
  'Nuova nota giornaliera: write dashboard; created_by = utente corrente.';
comment on policy cap_operational_diary_update on public.operational_diary_entries is
  'Modifica/eliminazione logica: write dashboard su qualsiasi nota (diario condiviso).';

notify pgrst, 'reload schema';
