-- Lettura anagrafica clienti per utenti operativi (PDF preventivo/DDT/fatturazione).

drop policy if exists cap_clienti_anagrafiche_select_operational on public.clienti_anagrafiche;
create policy cap_clienti_anagrafiche_select_operational on public.clienti_anagrafiche
for select to authenticated
using (
  public.user_effective_can('preventivi', 'read')
  or public.user_effective_can('ddt', 'read')
  or public.user_effective_can('fatturazione', 'read')
);

drop policy if exists cap_clienti_sedi_select_operational on public.clienti_sedi;
create policy cap_clienti_sedi_select_operational on public.clienti_sedi
for select to authenticated
using (
  public.user_effective_can('preventivi', 'read')
  or public.user_effective_can('ddt', 'read')
  or public.user_effective_can('fatturazione', 'read')
);

drop policy if exists cap_clienti_contatti_select_operational on public.clienti_contatti;
create policy cap_clienti_contatti_select_operational on public.clienti_contatti
for select to authenticated
using (
  public.user_effective_can('preventivi', 'read')
  or public.user_effective_can('ddt', 'read')
  or public.user_effective_can('fatturazione', 'read')
);
