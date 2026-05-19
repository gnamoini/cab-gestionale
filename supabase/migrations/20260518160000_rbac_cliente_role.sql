-- Portale clienti: policy SELECT estese (ruolo cliente già in ruolo_utente da 20260517194100).

drop policy if exists mezzi_select_role on public.mezzi;
create policy mezzi_select_role on public.mezzi for select to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'ospite', 'cliente', 'magazziniere', 'commerciale'));

drop policy if exists lavorazioni_select_role on public.lavorazioni;
create policy lavorazioni_select_role on public.lavorazioni for select to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'ospite', 'cliente', 'magazziniere', 'commerciale'));

drop policy if exists log_modifiche_select_role on public.log_modifiche;
create policy log_modifiche_select_role on public.log_modifiche for select to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'ospite', 'cliente', 'magazziniere', 'commerciale'));
