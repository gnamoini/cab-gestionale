-- Allow admin hard-delete ordini fornitori in any status (righe/links cascade).
begin;

drop policy if exists cap_ordini_fornitori_delete on public.ordini_fornitori;
create policy cap_ordini_fornitori_delete on public.ordini_fornitori
  for delete to authenticated
  using (public.rbac_module_can('ordini_fornitori', 'admin'));

commit;
