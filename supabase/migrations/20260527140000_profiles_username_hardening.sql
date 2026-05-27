-- Username obbligatorio + verifica disponibilità (solo admin sicurezza).

update public.profiles set username = 'utente_' || left(replace(id::text, '-', ''), 8) where username is null or trim(username) = '';

alter table public.profiles alter column username set not null;

create or replace function public.check_username_available(p_username text, p_exclude_user_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text := lower(trim(coalesce(p_username, '')));
begin
  if auth.uid() is null then
    raise exception 'Non autenticato';
  end if;

  if not public.rbac_has_capability(auth.uid(), 'can_manage_security') then
    raise exception 'Permesso negato';
  end if;

  if v = '' or char_length(v) < 3 or char_length(v) > 32 or v !~ '^[a-z0-9][a-z0-9._-]*[a-z0-9]$' then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles p
    where lower(p.username) = v
      and (p_exclude_user_id is null or p.id <> p_exclude_user_id)
  );
end;
$$;

revoke all on function public.check_username_available(text, uuid) from public;
grant execute on function public.check_username_available(text, uuid) to authenticated;

-- Login: se username non in profiles, prova solo email sintetica legacy se esiste in auth
create or replace function public.resolve_auth_email_for_login(p_identifier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v text := lower(trim(coalesce(p_identifier, '')));
  v_email text;
  v_legacy text;
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

  v_legacy := regexp_replace(v, '[^a-z0-9._+-]', '', 'g');
  v_legacy := trim(both '._-' from v_legacy);
  if v_legacy = '' then
    return null;
  end if;

  v_legacy := v_legacy || '@' || v_domain;

  if exists (select 1 from auth.users u where lower(u.email::text) = v_legacy) then
    return v_legacy;
  end if;

  return null;
end;
$$;
