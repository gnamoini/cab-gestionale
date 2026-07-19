-- Fix: alias `old` in prune_log_modifiche_retention collides with PL/pgSQL NEW/OLD
-- → every INSERT on log_modifiche failed (42702 ambiguous column) → magazzino ± toast errore.

create or replace function public.prune_log_modifiche_retention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_keep constant int := 100;
begin
  delete from public.log_modifiche prune_row
  where prune_row.entita = new.entita
    and prune_row.id in (
      select lm.id
      from public.log_modifiche lm
      where lm.entita = new.entita
      order by lm.created_at desc
      offset max_keep
    );
  return new;
end;
$$;
