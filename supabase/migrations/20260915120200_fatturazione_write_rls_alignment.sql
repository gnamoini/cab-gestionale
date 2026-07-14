-- Fatturazione: allinea RLS/RPC al contratto page-SSOT (READ/WRITE/NONE).
-- Chi ha page WRITE su fatturazione deve poter gestire le operazioni UX della pagina.
-- Non sostituisce globalmente admin→write: manutenzione batch resta admin (whitelist).

begin;

-- ---------------------------------------------------------------------------
-- Page UX: hard delete bozze (allineato a invoiceIsDeletable in app)
-- ---------------------------------------------------------------------------
drop policy if exists cap_invoices_delete on public.invoices;
create policy cap_invoices_delete on public.invoices
  for delete to authenticated
  using (
    public.rbac_module_can('fatturazione', 'write')
    and status in ('bozza', 'da_verificare')
  );

-- ---------------------------------------------------------------------------
-- Sensibile: delete pagamento solo su fattura padre ancora in bozza
-- (nessun flusso UI per delete pagamento su fatture emesse)
-- ---------------------------------------------------------------------------
drop policy if exists cap_invoice_payments_delete on public.invoice_payments;
create policy cap_invoice_payments_delete on public.invoice_payments
  for delete to authenticated
  using (
    public.rbac_module_can('fatturazione', 'write')
    and exists (
      select 1
      from public.invoices i
      where i.id = invoice_payments.invoice_id
        and i.status in ('bozza', 'da_verificare')
    )
  );

-- ---------------------------------------------------------------------------
-- Page UX: impostazioni fatturazione
-- ---------------------------------------------------------------------------
drop policy if exists cap_billing_settings on public.billing_settings;
create policy cap_billing_settings on public.billing_settings
  for all to authenticated
  using (public.rbac_module_can('fatturazione', 'read'))
  with check (public.rbac_module_can('fatturazione', 'write'));

-- ---------------------------------------------------------------------------
-- Page UX: numerazione fatture
-- ---------------------------------------------------------------------------
drop policy if exists cap_invoice_number_sequences_write on public.invoice_number_sequences;
create policy cap_invoice_number_sequences_write on public.invoice_number_sequences
  for all to authenticated
  using (public.rbac_module_can('fatturazione', 'write'))
  with check (public.rbac_module_can('fatturazione', 'write'));

-- ---------------------------------------------------------------------------
-- cancel_invoice: guard write esplicito prima della transition
-- ---------------------------------------------------------------------------
create or replace function public.cancel_invoice(p_invoice_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  perform public.invoice_apply_transition(
    p_invoice_id,
    'cancel',
    jsonb_build_object('reason', coalesce(p_reason, '')),
    public.rbac_auth_uid()
  );
end;
$$;

commit;
