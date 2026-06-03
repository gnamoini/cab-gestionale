-- Retention log_modifiche: ultimi 100 messaggi per entita (purge definitivo delle più vecchie).

delete from public.log_modifiche lm
where lm.id in (
  select t.id
  from (
    select
      id,
      row_number() over (partition by entita order by created_at desc) as rn
    from public.log_modifiche
  ) t
  where t.rn > 100
);

create or replace function public.prune_log_modifiche_retention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_keep constant int := 100;
begin
  delete from public.log_modifiche old
  where old.entita = new.entita
    and old.id in (
      select lm.id
      from public.log_modifiche lm
      where lm.entita = new.entita
      order by lm.created_at desc
      offset max_keep
    );
  return new;
end;
$$;

comment on function public.prune_log_modifiche_retention() is
  'Dopo INSERT su log_modifiche mantiene al più 100 righe per entita (elimina le più vecchie).';

drop trigger if exists trg_log_modifiche_retention on public.log_modifiche;

create trigger trg_log_modifiche_retention
after insert on public.log_modifiche
for each row
execute function public.prune_log_modifiche_retention();

comment on table public.log_modifiche is
  'Storico modifiche append-only; retention automatica: max 100 righe per entita.';
