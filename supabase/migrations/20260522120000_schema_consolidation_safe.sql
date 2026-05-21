-- Schema consolidation (safe, incremental, zero-downtime).
-- See docs/supabase-schema-refactor-report.md
--
-- NON fa: DROP TABLE, DROP TYPE, modifica colonne applicative.
-- FA: deprecazione segnalazioni (read-only), cleanup funzioni RBAC obsolete,
--     allineamento naming policy lavorazione_documents, compat current_profile_role.

-- =============================================================================
-- 1) current_profile_role → thin wrapper (single source: rbac_role)
-- =============================================================================
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_role();
$$;

comment on function public.current_profile_role() is
  'DEPRECATED: usare rbac_role(). Mantenuto per compatibilità policy/SQL legacy.';

-- =============================================================================
-- 2) Funzioni RBAC obsolete (sostituite da rbac_has_capability in 20260519150100)
-- =============================================================================
drop function if exists public.rbac_resource_allows_read(text);
drop function if exists public.rbac_resource_allows_write(text);
drop function if exists public.rbac_resource_allows_delete(text);

-- =============================================================================
-- 3) segnalazioni — tabella legacy (source of truth: support_notes)
-- =============================================================================
comment on table public.segnalazioni is
  'DEPRECATED: dati migrati in support_notes (20260520210000). Solo lettura; non inserire nuove righe.';

-- Rimuovi policy di scrittura (se ancora presenti)
drop policy if exists cap_segnalazioni_insert on public.segnalazioni;
drop policy if exists cap_segnalazioni_update on public.segnalazioni;
drop policy if exists segnalazioni_insert_role on public.segnalazioni;
drop policy if exists segnalazioni_update_role on public.segnalazioni;

-- Policy SELECT: capability model (idempotente)
drop policy if exists cap_segnalazioni_select on public.segnalazioni;
create policy cap_segnalazioni_select on public.segnalazioni
for select to authenticated
using (
  deleted_at is null
  and public.rbac_has_capability(public.rbac_auth_uid(), 'can_read_operational')
);

revoke insert, update on table public.segnalazioni from authenticated;
grant select on table public.segnalazioni to authenticated;

-- =============================================================================
-- 4) lavorazione_documents — naming cap_* (stesse regole di rbac_*)
-- =============================================================================
drop policy if exists cap_lavorazione_documents_select on public.lavorazione_documents;
create policy cap_lavorazione_documents_select on public.lavorazione_documents
for select to authenticated
using (public.rbac_can_read_row('lavorazioni', lavorazione_id));

drop policy if exists cap_lavorazione_documents_insert on public.lavorazione_documents;
create policy cap_lavorazione_documents_insert on public.lavorazione_documents
for insert to authenticated
with check (
  public.rbac_can_write('lavorazioni')
  and public.rbac_can_read_row('lavorazioni', lavorazione_id)
);

drop policy if exists cap_lavorazione_documents_update on public.lavorazione_documents;
create policy cap_lavorazione_documents_update on public.lavorazione_documents
for update to authenticated
using (
  public.rbac_can_write('lavorazioni')
  and public.rbac_can_read_row('lavorazioni', lavorazione_id)
)
with check (
  public.rbac_can_write('lavorazioni')
  and public.rbac_can_read_row('lavorazioni', lavorazione_id)
);

drop policy if exists cap_lavorazione_documents_delete on public.lavorazione_documents;
create policy cap_lavorazione_documents_delete on public.lavorazione_documents
for delete to authenticated
using (
  public.rbac_can_write('lavorazioni')
  and public.rbac_can_read_row('lavorazioni', lavorazione_id)
);

-- Rimuovi nomi legacy (evita policy duplicate OR-combined)
drop policy if exists rbac_lavorazione_documents_select on public.lavorazione_documents;
drop policy if exists rbac_lavorazione_documents_insert on public.lavorazione_documents;
drop policy if exists rbac_lavorazione_documents_update on public.lavorazione_documents;
drop policy if exists rbac_lavorazione_documents_delete on public.lavorazione_documents;

-- =============================================================================
-- 5) Registry commenti tabelle operative
-- =============================================================================
comment on table public.support_notes is
  'Note condivise modulo Supporto (source of truth). Realtime-enabled.';
comment on table public.lavorazione_documents is
  'PDF lavorazione (preventivo_upload, ddt). Policy: cap_lavorazione_documents_*.';
comment on table public.lavorazioni is
  'Lavorazioni officina. Soft delete via deleted_at + RPC soft_delete_lavorazione.';
