-- Deprecazione modulo Supporto: revoca scrittura su tabelle legacy.

comment on table public.segnalazioni is 'DEPRECATED — modulo Supporto rimosso. Solo lettura admin fino a drop pianificato.';
comment on table public.support_notes is 'DEPRECATED — modulo Supporto rimosso. Solo lettura admin fino a drop pianificato.';

drop policy if exists segnalazioni_insert on public.segnalazioni;
drop policy if exists segnalazioni_update on public.segnalazioni;
drop policy if exists segnalazioni_delete on public.segnalazioni;

drop policy if exists support_notes_insert on public.support_notes;
drop policy if exists support_notes_update on public.support_notes;
drop policy if exists support_notes_delete on public.support_notes;

-- Mantieni solo SELECT per admin (audit/storico).
drop policy if exists segnalazioni_select_admin on public.segnalazioni;
create policy segnalazioni_select_admin on public.segnalazioni
  for select to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

drop policy if exists support_notes_select_admin on public.support_notes;
create policy support_notes_select_admin on public.support_notes
  for select to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));
