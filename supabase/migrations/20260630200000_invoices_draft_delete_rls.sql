-- Bozze eliminabili da chi ha write su fatturazione (hard delete + cascade righe/link).

drop policy if exists cap_invoices_delete on public.invoices;
create policy cap_invoices_delete on public.invoices for delete to authenticated
using (
  public.rbac_module_can('fatturazione', 'write')
  and status in ('bozza', 'da_verificare')
);
