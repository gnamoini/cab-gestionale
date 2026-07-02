-- profiles.cognome — campo distinto da nome (given name).
-- Backfill one-shot: ultimo token → cognome (ponytail: nomi composti ambigui vanno corretti da admin).

alter table public.profiles
  add column if not exists cognome text;

comment on column public.profiles.cognome is
  'Cognome utente; nullable per record legacy mono-campo.';

alter table public.profiles
  drop constraint if exists profiles_cognome_len;

alter table public.profiles
  add constraint profiles_cognome_len check (
    cognome is null or char_length(trim(cognome)) > 0
  );

update public.profiles p
set
  nome = trim(regexp_replace(trim(p.nome), '\s+\S+$', '')),
  cognome = trim(substring(trim(p.nome) from '\S+$'))
where p.cognome is null
  and position(' ' in trim(p.nome)) > 0
  and trim(substring(trim(p.nome) from '\S+$')) <> '';

create or replace function public.profile_display_name(p_nome text, p_cognome text)
returns text
language sql
immutable
as $$
  select trim(both from coalesce(nullif(trim(p_nome), ''), '') ||
    case when nullif(trim(p_cognome), '') is not null then ' ' || trim(p_cognome) else '' end);
$$;

comment on function public.profile_display_name(text, text) is
  'Nome visualizzato composto da profiles.nome + profiles.cognome.';

-- handle_new_user: cab_nome + cab_cognome (split transitorio solo in trigger se cab_cognome assente)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_cognome text;
  v_app_nome text;
  v_app_cognome text;
  v_app_ruolo text;
  v_app_username text;
  v_username text;
  v_ruolo public.ruolo_utente := 'operatore'::public.ruolo_utente;
  v_base text;
  v_candidate text;
  v_n int;
begin
  v_app_nome := nullif(trim(coalesce(new.raw_app_meta_data->>'cab_nome', '')), '');
  v_app_cognome := nullif(trim(coalesce(new.raw_app_meta_data->>'cab_cognome', '')), '');

  if v_app_nome is not null and v_app_cognome is null and position(' ' in v_app_nome) > 0 then
    v_cognome := trim(substring(v_app_nome from '\S+$'));
    v_nome := trim(regexp_replace(v_app_nome, '\s+\S+$', ''));
  else
    v_nome := coalesce(v_app_nome, nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''), 'utente');
    v_cognome := v_app_cognome;
  end if;

  v_app_ruolo := lower(nullif(trim(coalesce(new.raw_app_meta_data->>'cab_ruolo', '')), ''));
  if v_app_ruolo = 'commerciale' then
    v_ruolo := 'addetto_amministrativo'::public.ruolo_utente;
  elsif v_app_ruolo in ('tecnico', 'magazziniere') then
    v_ruolo := 'operatore'::public.ruolo_utente;
  elsif v_app_ruolo in ('viewer', 'sola_lettura', 'ospite') then
    v_ruolo := 'guest'::public.ruolo_utente;
  elsif v_app_ruolo in (
    'admin', 'manager', 'operatore', 'addetto_amministrativo', 'cliente', 'guest'
  ) then
    v_ruolo := v_app_ruolo::public.ruolo_utente;
  end if;

  v_app_username := lower(trim(coalesce(new.raw_app_meta_data->>'cab_username', '')));
  if v_app_username <> '' and v_app_username ~ '^[a-z0-9][a-z0-9._-]*[a-z0-9]$' and char_length(v_app_username) between 3 and 32 then
    v_username := v_app_username;
  else
    v_base := regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9._-]', '', 'g');
    v_base := trim(both '._-' from v_base);
    if v_base is null or char_length(v_base) < 3 then
      v_base := 'utente';
    end if;
    if char_length(v_base) > 32 then
      v_base := left(v_base, 32);
    end if;
    v_candidate := v_base;
    v_n := 1;
    while exists (
      select 1 from public.profiles p2 where lower(p2.username) = lower(v_candidate)
    ) loop
      v_n := v_n + 1;
      v_candidate := left(v_base, greatest(3, 32 - char_length(v_n::text) - 1)) || v_n::text;
    end loop;
    v_username := v_candidate;
  end if;

  insert into public.profiles (id, nome, cognome, ruolo, username)
  values (new.id, v_nome, v_cognome, v_ruolo, v_username)
  on conflict (id) do update
    set nome = excluded.nome,
        cognome = coalesce(excluded.cognome, public.profiles.cognome),
        ruolo = excluded.ruolo,
        username = coalesce(public.profiles.username, excluded.username);

  return new;
end;
$$;

grant execute on function public.profile_display_name(text, text) to authenticated;
