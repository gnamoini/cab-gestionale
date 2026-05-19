-- Profilo da creazione admin: nome e ruolo da app_metadata (solo service role / Admin API).
-- I client non possono impostare app_metadata in signUp: evita escalation privilegi via user_metadata.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_ruolo public.ruolo_utente := 'operatore'::public.ruolo_utente;
  v_app_nome text;
  v_app_ruolo text;
begin
  v_app_nome := nullif(trim(coalesce(new.raw_app_meta_data->>'cab_nome', '')), '');
  if v_app_nome is not null then
    v_nome := v_app_nome;
  else
    v_nome := nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), '');
    if v_nome is null then
      v_nome := 'utente';
    end if;
  end if;

  v_app_ruolo := lower(nullif(trim(coalesce(new.raw_app_meta_data->>'cab_ruolo', '')), ''));
  if v_app_ruolo in ('admin', 'operatore', 'ospite', 'cliente', 'magazziniere', 'commerciale', 'sola_lettura') then
    v_ruolo := v_app_ruolo::public.ruolo_utente;
  elsif v_app_ruolo in ('tecnico', 'viewer') then
    v_ruolo := case when v_app_ruolo = 'tecnico' then 'operatore' else 'sola_lettura' end::public.ruolo_utente;
  end if;

  insert into public.profiles (id, nome, ruolo)
  values (new.id, v_nome, v_ruolo)
  on conflict (id) do nothing;

  return new;
end;
$$;
