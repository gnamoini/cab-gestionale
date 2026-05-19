-- Enum ruoli canonici: manager, guest (transazione separata).

do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'ruolo_utente' and e.enumlabel = 'manager'
  ) then
    alter type public.ruolo_utente add value 'manager';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'ruolo_utente' and e.enumlabel = 'guest'
  ) then
    alter type public.ruolo_utente add value 'guest';
  end if;
end $$;
