-- Consente undo/revert payload su log_modifiche a admin e operatore (markReverted client-side).

drop policy if exists log_modifiche_update_priv on public.log_modifiche;
create policy log_modifiche_update_priv
on public.log_modifiche for update to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'magazziniere', 'commerciale'))
with check (public.current_profile_role() in ('admin', 'operatore', 'magazziniere', 'commerciale'));
