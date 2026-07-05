-- Portale cliente: lettura anagrafica propria (profilo «La tua azienda»).

drop policy if exists cap_clienti_anagrafiche_select_cliente_portal on public.clienti_anagrafiche;
create policy cap_clienti_anagrafiche_select_cliente_portal on public.clienti_anagrafiche
for select to authenticated
using (
  public.rbac_is_cliente()
  and public.rbac_cliente_ref() is not null
  and trim(nome_display) = public.rbac_cliente_ref()
);

drop policy if exists cap_clienti_sedi_select_cliente_portal on public.clienti_sedi;
create policy cap_clienti_sedi_select_cliente_portal on public.clienti_sedi
for select to authenticated
using (
  public.rbac_is_cliente()
  and public.rbac_cliente_ref() is not null
  and exists (
    select 1
    from public.clienti_anagrafiche a
    where a.id = cliente_id
      and trim(a.nome_display) = public.rbac_cliente_ref()
  )
);

drop policy if exists cap_clienti_contatti_select_cliente_portal on public.clienti_contatti;
create policy cap_clienti_contatti_select_cliente_portal on public.clienti_contatti
for select to authenticated
using (
  public.rbac_is_cliente()
  and public.rbac_cliente_ref() is not null
  and exists (
    select 1
    from public.clienti_anagrafiche a
    where a.id = cliente_id
      and trim(a.nome_display) = public.rbac_cliente_ref()
  )
);
