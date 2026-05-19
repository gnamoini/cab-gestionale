-- Aggiunta valori enum ruolo_utente (transazione separata: richiesto da PostgreSQL).

do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'ruolo_utente' and e.enumlabel = 'ospite'
  ) then
    alter type public.ruolo_utente add value 'ospite';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'ruolo_utente' and e.enumlabel = 'cliente'
  ) then
    alter type public.ruolo_utente add value 'cliente';
  end if;
end $$;
