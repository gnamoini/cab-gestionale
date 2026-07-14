-- Ripristina cognome in handle_new_user (perso in rbac_data_driven_core).

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
  v_role_key text := 'operatore';
  v_role_id uuid;
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
  v_role_key := public.rbac_normalize_role(v_app_ruolo);
  if v_role_key = '' or not exists (select 1 from public.roles where key = v_role_key and is_active) then
    v_role_key := 'operatore';
  end if;

  v_app_username := lower(trim(coalesce(new.raw_app_meta_data->>'cab_username', '')));
  if v_app_username <> '' and v_app_username ~ '^[a-z0-9][a-z0-9._-]*[a-z0-9]$' and char_length(v_app_username) between 3 and 32 then
    v_username := v_app_username;
  else
    v_base := regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9._-]', '', 'g');
    v_base := trim(both '._-' from v_base);
    if v_base is null or char_length(v_base) < 3 then v_base := 'utente'; end if;
    if char_length(v_base) > 32 then v_base := left(v_base, 32); end if;
    v_candidate := v_base;
    v_n := 1;
    while exists (select 1 from public.profiles p2 where lower(p2.username) = lower(v_candidate)) loop
      v_n := v_n + 1;
      v_candidate := left(v_base, greatest(3, 32 - char_length(v_n::text) - 1)) || v_n::text;
    end loop;
    v_username := v_candidate;
  end if;

  insert into public.profiles (id, nome, cognome, role_key, username)
  values (new.id, v_nome, v_cognome, v_role_key, v_username)
  on conflict (id) do update
    set nome = excluded.nome,
        cognome = coalesce(public.profiles.cognome, excluded.cognome),
        role_key = coalesce(public.profiles.role_key, excluded.role_key),
        username = coalesce(public.profiles.username, excluded.username);

  select id into v_role_id from public.roles where key = v_role_key;
  if v_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (new.id, v_role_id)
    on conflict (user_id) do update set role_id = excluded.role_id;
  end if;

  return new;
end;
$$;
