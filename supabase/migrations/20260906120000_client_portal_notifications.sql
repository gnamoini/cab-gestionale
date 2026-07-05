-- Portale clienti: inbox notifiche ingresso/completata (scope user, dedup per lavorazione).

begin;

insert into public.notification_type_registry (
  type, allowed_scope_type, allowed_scope_value, allowed_scope_module, default_priority, caller_min_role
) values
  ('client_portal_ingresso', 'user', '__TARGET_USER__', 'lavorazioni', 'high', 'staff'),
  ('client_portal_completata', 'user', '__TARGET_USER__', 'lavorazioni', 'medium', 'staff')
on conflict (type) do nothing;

create or replace function public.notification_cliente_inbox_eligible()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_is_cliente()
    and public.rbac_has_capability(auth.uid(), 'can_access_client_area');
$$;

create or replace function public.notification_visible_to_auth_user(p_n public.notifications)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      public.notification_staff_inbox_eligible()
      and (
        public.rbac_role() in ('admin', 'manager')
        or p_n.scope_type = 'global'
        or (p_n.scope_type = 'user' and p_n.scope_value = auth.uid()::text)
        or (
          p_n.scope_type = 'role'
          and p_n.scope_value = public.rbac_role()
          and public.user_effective_can(p_n.scope_module, 'read')
        )
      )
    )
    or (
      public.notification_cliente_inbox_eligible()
      and p_n.scope_type = 'user'
      and p_n.scope_value = auth.uid()::text
      and p_n.type in ('client_portal_ingresso', 'client_portal_completata')
    );
$$;

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
  v_role text;
  v_event text := lower(trim(coalesce(p_event, '')));
  v_type text;
  v_title text;
  v_body text;
  v_href text;
  v_cliente text;
  v_codice text;
  v_mezzo_label text;
  v_rec record;
  v_new_id uuid;
  v_allowlist jsonb;
  v_dedup text;
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
      v_caller
    )
    on conflict (dedup_key) do nothing
    returning notifications.id into v_new_id;

    if v_new_id is not null then
      target_user_id := v_rec.user_id;
      notification_id := v_new_id;
      inserted := true;
      return next;
    else
      select n.id into v_new_id from public.notifications n where n.dedup_key = v_dedup;
      target_user_id := v_rec.user_id;
      notification_id := v_new_id;
      inserted := false;
      return next;
    end if;
  end loop;
end;
$$;

revoke all on function public.cab_fanout_client_portal_lavorazione_notification(text, uuid) from public, anon;
grant execute on function public.cab_fanout_client_portal_lavorazione_notification(text, uuid) to authenticated;

commit;
