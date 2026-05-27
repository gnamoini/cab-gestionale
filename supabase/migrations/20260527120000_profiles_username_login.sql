-- Nome utente univoco per login alternativo all'email.

alter table public.profiles
  add column if not exists username text;

comment on column public.profiles.username is 'Login: univoco (case-insensitive), 3–32 caratteri [a-z0-9._-]';

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format check (
    username is null
    or (
      char_length(username) between 3 and 32
      and username ~ '^[a-z0-9][a-z0-9._-]*[a-z0-9]$'
    )
  );

-- Backfill da email Auth (local-part), con suffisso numerico in caso di collisione.
do $$
declare
  r record;
  v_base text;
  v_candidate text;
  v_n int;
begin
  for r in
    select p.id, lower(split_part(u.email, '@', 1)) as local_part
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.username is null
  loop
    v_base := regexp_replace(coalesce(r.local_part, ''), '[^a-z0-9._-]', '', 'g');
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
    update public.profiles set username = v_candidate where id = r.id;
  end loop;
end;
$$;

-- Risolve email Auth per login (email completa o username).
create or replace function public.resolve_auth_email_for_login(p_identifier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v text := lower(trim(coalesce(p_identifier, '')));
  v_email text;
  v_domain text := coalesce(
    nullif(trim(current_setting('app.settings.auth_login_email_domain', true)), ''),
    'app.local'
  );
begin
  if v = '' then
    return null;
  end if;

  if position('@' in v) > 0 then
    return v;
  end if;

  select lower(u.email::text)
  into v_email
  from public.profiles p
  inner join auth.users u on u.id = p.id
  where lower(p.username) = v
  limit 1;

  if v_email is not null then
    return v_email;
  end if;

  -- Compatibilità: account legacy con email sintetica local@domain
  v := regexp_replace(v, '[^a-z0-9._+-]', '', 'g');
  v := trim(both '._-' from v);
  if v = '' then
    return null;
  end if;
  return v || '@' || v_domain;
end;
$$;

revoke all on function public.resolve_auth_email_for_login(text) from public;
grant execute on function public.resolve_auth_email_for_login(text) to anon, authenticated;

-- Profilo nuovo: username da app_metadata o local-part email (univoco).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_app_nome text;
  v_app_ruolo text;
  v_app_username text;
  v_username text;
  v_ruolo public.ruolo_utente := 'operatore'::public.ruolo_utente;
  v_base text;
  v_candidate text;
  v_n int;
begin
  v_app_nome := nullif(trim(coalesce(new.raw_app_meta_data->>'cab_nome', '')), '');
  v_nome := coalesce(v_app_nome, nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''), 'utente');

  v_app_ruolo := nullif(trim(coalesce(new.raw_app_meta_data->>'cab_ruolo', '')), '');
  if v_app_ruolo in ('admin', 'operatore', 'ospite', 'cliente', 'magazziniere', 'commerciale') then
    v_ruolo := v_app_ruolo::public.ruolo_utente;
  elsif v_app_ruolo = 'tecnico' then
    v_ruolo := 'operatore'::public.ruolo_utente;
  elsif v_app_ruolo in ('viewer', 'sola_lettura') then
    v_ruolo := 'ospite'::public.ruolo_utente;
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

  insert into public.profiles (id, nome, ruolo, username)
  values (new.id, v_nome, v_ruolo, v_username)
  on conflict (id) do update
    set nome = excluded.nome,
        ruolo = excluded.ruolo,
        username = coalesce(public.profiles.username, excluded.username);

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
