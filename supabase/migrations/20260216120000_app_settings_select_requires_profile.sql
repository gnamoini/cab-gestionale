-- app_settings: SELECT solo per utenti con riga in public.profiles (auth.uid() = profiles.id).
-- Sostituisce eventuale policy precedente basata solo su auth.uid() is not null.
-- Scrittura: invariata (solo admin) — vedi 20260212120000_app_settings.sql
-- Backfill: one-shot, idempotente (nessun trigger aggiuntivo).

drop policy if exists app_settings_select_auth on public.app_settings;
create policy app_settings_select_auth
on public.app_settings for select to authenticated
using (
  exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid()
  )
);

-- Profili mancanti rispetto a auth.users (allineamento storico; non è sync continuo)
insert into public.profiles (id, nome, ruolo)
select u.id,
  coalesce(nullif(trim(split_part(coalesce(u.email, ''), '@', 1)), ''), 'utente'),
  'operatore'::public.ruolo_utente
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
