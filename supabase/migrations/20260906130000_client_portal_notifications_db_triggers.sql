-- Portale clienti: fanout notifiche da trigger DB (nessun browser staff richiesto).

begin;

-- Core interno: stesso payload/dedup della RPC pubblica, senza gate auth.
create or replace function public.cab_fanout_client_portal_lavorazione_notification_core(
  p_event text,
  p_lavorazione_id uuid,
  p_created_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event text := lower(trim(coalesce(p_event, '')));
  v_type text;
  v_title text;
  v_body text;
  v_href text;
  v_cliente text;
  v_codice text;
  v_mezzo_label text;
  v_rec record;
  v_allowlist jsonb;
  v_dedup text;
  v_actor uuid := coalesce(p_created_by, auth.uid());
begin
  if p_lavorazione_id is null then
    return;
  end if;

  if v_event not in ('ingresso', 'completata') then
    return;
  end if;

  v_type := case v_event when 'ingresso' then 'client_portal_ingresso' else 'client_portal_completata' end;

  select
    nullif(trim(m.cliente), ''),
    nullif(trim(l.codice), ''),
    nullif(trim(coalesce(nullif(trim(m.targa), ''), nullif(trim(m.matricola), ''))), '')
  into v_cliente, v_codice, v_mezzo_label
  from public.lavorazioni l
  join public.mezzi m on m.id = l.mezzo_id
  where l.id = p_lavorazione_id
    and l.deleted_at is null;

  if v_cliente is null then
    return;
  end if;

  v_codice := coalesce(v_codice, left(p_lavorazione_id::text, 8));
  v_mezzo_label := coalesce(v_mezzo_label, '—');
  v_href := '/lavorazioni-clienti/' || p_lavorazione_id::text;

  if v_event = 'ingresso' then
    v_title := 'Nuovo ingresso';
    v_body := 'Lavorazione ' || v_codice || ' · ' || v_mezzo_label;
  else
    v_title := 'Lavorazione completata';
    v_body := 'Lavorazione ' || v_codice || ' · ' || v_mezzo_label;
  end if;

  select coalesce(s.value->'enabledUserIds', '[]'::jsonb)
  into v_allowlist
  from public.app_settings s
  where s.module = 'lavorazioni'
    and s.key = 'client_portal_access'
  limit 1;

  for v_rec in
    select p.id as user_id
    from public.profiles p
    where p.role_key = 'cliente'
      and lower(trim(coalesce(p.cliente_ref, ''))) = lower(trim(v_cliente))
      and public.rbac_has_capability(p.id, 'can_access_client_area')
      and (
        coalesce(jsonb_array_length(v_allowlist), 0) = 0
        or exists (
          select 1
          from jsonb_array_elements_text(v_allowlist) el
          where el = p.id::text
        )
      )
  loop
    v_dedup := 'client-portal:' || v_event || ':' || v_rec.user_id::text || ':' || p_lavorazione_id::text;

    insert into public.notifications (
      type, scope_type, scope_value, scope_module, priority,
      title, body, href, entity_type, entity_id, dedup_key, created_by
    ) values (
      v_type,
      'user',
      v_rec.user_id::text,
      'lavorazioni',
      case v_event when 'ingresso' then 'high' else 'medium' end,
      v_title,
      v_body,
      v_href,
      'lavorazioni',
      p_lavorazione_id,
      v_dedup,
      v_actor
    )
    on conflict (dedup_key) do nothing;
  end loop;
end;
$$;

revoke all on function public.cab_fanout_client_portal_lavorazione_notification_core(text, uuid, uuid) from public, anon, authenticated;

create or replace function public.cab_fanout_client_portal_lavorazione_notification(
  p_event text,
  p_lavorazione_id uuid
)
returns table (target_user_id uuid, notification_id uuid, inserted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_event text := lower(trim(coalesce(p_event, '')));
  v_type text;
  v_rec record;
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;

  if not public.notification_staff_inbox_eligible() then
    raise exception 'ERR_CALLER_ROLE_DENIED';
  end if;

  if p_lavorazione_id is null then
    raise exception 'ERR_LAVORAZIONE_ID_REQUIRED';
  end if;

  if v_event not in ('ingresso', 'completata') then
    raise exception 'ERR_EVENT_INVALID';
  end if;

  v_type := case v_event when 'ingresso' then 'client_portal_ingresso' else 'client_portal_completata' end;

  perform public.cab_fanout_client_portal_lavorazione_notification_core(
    v_event,
    p_lavorazione_id,
    v_caller
  );

  for v_rec in
    select n.scope_value::uuid as user_id, n.id as notification_id
    from public.notifications n
    where n.type = v_type
      and n.entity_id = p_lavorazione_id
      and n.scope_type = 'user'
  loop
    target_user_id := v_rec.user_id;
    notification_id := v_rec.notification_id;
    inserted := true;
    return next;
  end loop;
end;
$$;

revoke all on function public.cab_fanout_client_portal_lavorazione_notification(text, uuid) from public, anon;
grant execute on function public.cab_fanout_client_portal_lavorazione_notification(text, uuid) to authenticated;

create or replace function public.trg_fanout_client_portal_lavorazione_ingresso()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null then
    return new;
  end if;

  perform public.cab_fanout_client_portal_lavorazione_notification_core(
    'ingresso',
    new.id,
    new.created_by
  );

  return new;
end;
$$;

create or replace function public.trg_fanout_client_portal_lavorazione_completata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null then
    return new;
  end if;

  if old.stato is not distinct from 'completata' then
    return new;
  end if;

  if new.stato is distinct from 'completata' then
    return new;
  end if;

  perform public.cab_fanout_client_portal_lavorazione_notification_core(
    'completata',
    new.id,
    coalesce(new.updated_by, new.created_by)
  );

  return new;
end;
$$;

drop trigger if exists trg_lavorazioni_client_portal_ingresso on public.lavorazioni;
create trigger trg_lavorazioni_client_portal_ingresso
  after insert on public.lavorazioni
  for each row
  execute function public.trg_fanout_client_portal_lavorazione_ingresso();

drop trigger if exists trg_lavorazioni_client_portal_completata on public.lavorazioni;
create trigger trg_lavorazioni_client_portal_completata
  after update of stato on public.lavorazioni
  for each row
  execute function public.trg_fanout_client_portal_lavorazione_completata();

commit;
