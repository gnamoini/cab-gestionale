-- INT-002: single writer transaction-local flags for ordini_fornitori.status

create or replace function public.ordine_fornitore_transition_status(
  p_id uuid,
  p_new_status text,
  p_expected_updated_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc public.ordini_fornitori%rowtype;
begin
  perform public.security_assert_authenticated();
  if not public.rbac_module_can('ordini_fornitori', 'write') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  select * into v_doc from public.ordini_fornitori where id = p_id for update;
  if not found then raise exception 'Ordine non trovato'; end if;
  if v_doc.status = 'annullato' then raise exception 'Ordine annullato'; end if;
  if v_doc.status = p_new_status then return; end if;

  if p_new_status not in ('bozza', 'inviato', 'in_consegna', 'consegnato', 'annullato') then
    raise exception 'Stato ordine non valido: %', p_new_status;
  end if;

  if not (
    case v_doc.status
      when 'bozza' then p_new_status in ('inviato', 'annullato')
      when 'inviato' then p_new_status in ('in_consegna', 'annullato')
      when 'in_consegna' then p_new_status = 'annullato'
      else false
    end
  ) then
    raise exception 'Transizione stato non consentita: % → %', v_doc.status, p_new_status;
  end if;

  if p_expected_updated_at is not null and v_doc.updated_at <> p_expected_updated_at then
    raise exception 'CONFLICT: record modified';
  end if;

  perform set_config('app.order_status_transition', 'true', true);
  update public.ordini_fornitori
  set status = p_new_status,
      updated_by = auth.uid()
  where id = p_id;
  perform set_config('app.order_status_transition', 'false', true);
end;
$$;

create or replace function public.ordine_fornitore_guard_direct_status_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.order_status_transition', true), '') <> 'true'
  then
    raise exception 'Aggiornamento diretto status non consentito; usare ordine_fornitore_transition_status';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ordini_fornitori_guard_status on public.ordini_fornitori;
create trigger trg_ordini_fornitori_guard_status
before update of status on public.ordini_fornitori
for each row execute function public.ordine_fornitore_guard_direct_status_update();

revoke all on function public.ordine_fornitore_transition_status(uuid, text, timestamptz) from public, anon;
grant execute on function public.ordine_fornitore_transition_status(uuid, text, timestamptz) to authenticated, service_role;

notify pgrst, 'reload schema';
