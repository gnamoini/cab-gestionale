BEGIN;

do $$
declare
  v_user_id uuid;
  v_ruolo_before public.ruolo_utente;
  v_err text;
begin
  select id, ruolo into v_user_id, v_ruolo_before
  from public.profiles
  where ruolo <> 'admin'
  limit 1;

  if v_user_id is null then
    raise exception 'verify: no fixture profile';
  end if;

  begin
    update public.profiles set ruolo = 'manager' where id = v_user_id;
    raise exception 'verify FAIL: direct UPDATE should raise';
  exception when others then
    v_err := sqlerrm;
    if v_err not like '%immutable except via RPC%' then
      raise exception 'verify FAIL: unexpected error: %', v_err;
    end if;
  end;

  perform public.security_set_user_role(v_user_id, 'manager');

  if (select ruolo from public.profiles where id = v_user_id) <> 'manager' then
    raise exception 'verify FAIL: RPC did not update ruolo';
  end if;

  if (select count(*) from public.user_permissions where user_id = v_user_id) <> 0 then
    raise exception 'verify FAIL: permissions not cleared after RPC';
  end if;

  begin
    update public.profiles set ruolo = 'operatore' where id = v_user_id;
    raise exception 'verify FAIL: second direct UPDATE should raise';
  exception when others then
    if sqlerrm not like '%immutable except via RPC%' then
      raise exception 'verify FAIL: second UPDATE error: %', sqlerrm;
    end if;
  end;

  if coalesce(current_setting('app.security_set_user_role', true), '') = '1' then
    raise exception 'verify FAIL: GUC persisted outside RPC transaction';
  end if;

  raise notice 'verify-role-switch-gate: PASS';
end $$;

ROLLBACK;
