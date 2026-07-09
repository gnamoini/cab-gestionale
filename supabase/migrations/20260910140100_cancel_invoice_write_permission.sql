-- Annullamento fattura: permesso write (non solo admin).
begin;

create or replace function public.cancel_invoice(p_invoice_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  update public.invoices
  set status = 'annullata',
      annullata_at = now(),
      admin_notes = trim(coalesce(admin_notes || E'\n', '') || coalesce(p_reason, '')),
      updated_by = v_uid
  where id = p_invoice_id and status <> 'annullata';

  if not found then
    raise exception 'Fattura non trovata o già annullata';
  end if;
end;
$$;

commit;
