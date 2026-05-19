-- Operatore: CRUD operativo completo (DELETE incluso). Allinea RLS a rbac_can_delete / rbac_can_write.

-- ---------------------------------------------------------------------------
-- rbac_role: manager/guest → ruoli operativi
-- ---------------------------------------------------------------------------
create or replace function public.rbac_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case coalesce(public.current_profile_role(), '')
    when 'magazziniere' then 'operatore'
    when 'commerciale' then 'operatore'
    when 'tecnico' then 'operatore'
    when 'manager' then 'operatore'
    when 'sola_lettura' then 'ospite'
    when 'guest' then 'ospite'
    else coalesce(public.current_profile_role(), '')
  end;
$$;

-- ---------------------------------------------------------------------------
-- DELETE operativo: admin + operatore (non solo admin)
-- ---------------------------------------------------------------------------
create or replace function public.rbac_resource_allows_delete(p_resource text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if public.rbac_auth_uid() is null then
    return false;
  end if;

  v_role := public.rbac_role();
  if v_role = 'admin' then
    return true;
  end if;

  case p_resource
    when 'profiles', 'app_settings', 'security', 'log_modifiche' then
      return false;
    when 'lavorazioni', 'mezzi', 'scheda_lavorazione', 'magazzino', 'movimenti_ricambi',
         'preventivi', 'documenti', 'segnalazioni' then
      return v_role = 'operatore';
    else
      return false;
  end case;
end;
$$;

-- ---------------------------------------------------------------------------
-- Policy DELETE → rbac_can_delete (operatore incluso)
-- ---------------------------------------------------------------------------
drop policy if exists rbac_mezzi_delete on public.mezzi;
create policy rbac_mezzi_delete on public.mezzi for delete to authenticated
using (public.rbac_can_delete('mezzi'));

drop policy if exists rbac_lavorazioni_delete on public.lavorazioni;
create policy rbac_lavorazioni_delete on public.lavorazioni for delete to authenticated
using (public.rbac_can_delete('lavorazioni'));

drop policy if exists rbac_scheda_lavorazione_delete on public.scheda_lavorazione;
create policy rbac_scheda_lavorazione_delete on public.scheda_lavorazione for delete to authenticated
using (public.rbac_can_delete('scheda_lavorazione'));

drop policy if exists rbac_magazzino_ricambi_delete on public.magazzino_ricambi;
create policy rbac_magazzino_ricambi_delete on public.magazzino_ricambi for delete to authenticated
using (public.rbac_can_delete('magazzino'));

drop policy if exists rbac_movimenti_ricambi_delete on public.movimenti_ricambi;
create policy rbac_movimenti_ricambi_delete on public.movimenti_ricambi for delete to authenticated
using (public.rbac_can_delete('movimenti_ricambi'));

drop policy if exists rbac_preventivi_delete on public.preventivi;
create policy rbac_preventivi_delete on public.preventivi for delete to authenticated
using (public.rbac_can_delete('preventivi'));

drop policy if exists rbac_documenti_delete on public.documenti;
create policy rbac_documenti_delete on public.documenti for delete to authenticated
using (public.rbac_can_delete('documenti'));

-- log_modifiche: purge solo admin (invariato)
drop policy if exists rbac_log_modifiche_delete on public.log_modifiche;
create policy rbac_log_modifiche_delete on public.log_modifiche for delete to authenticated
using (public.rbac_is_admin());

do $$
begin
  raise notice 'Operatore operational CRUD: DELETE policies allineate.';
end $$;
