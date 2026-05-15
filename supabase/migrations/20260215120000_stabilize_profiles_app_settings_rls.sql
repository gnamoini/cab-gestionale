-- Post-migrazione auth + app_settings: SELECT app_settings per ogni sessione JWT valida;
-- backfill public.profiles per auth.users senza riga (1:1 su id).

-- ---------------------------------------------------------------------------
-- app_settings: lettura per qualsiasi utente autenticato (auth.uid() valorizzato)
-- Scrittura invariata: solo admin (current_profile_role() = 'admin')
-- ---------------------------------------------------------------------------
drop policy if exists app_settings_select_auth on public.app_settings;
create policy app_settings_select_auth
on public.app_settings for select to authenticated
using (auth.uid() is not null);

-- Privilegi tabella (RLS resta gate principale)
grant select on table public.app_settings to authenticated;
grant insert, update, delete on table public.app_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Profili mancanti (es. utenti creati prima del trigger handle_new_user)
-- ---------------------------------------------------------------------------
insert into public.profiles (id, nome, ruolo)
select u.id,
  coalesce(nullif(trim(split_part(coalesce(u.email, ''), '@', 1)), ''), 'utente'),
  'tecnico'::public.ruolo_profile
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
