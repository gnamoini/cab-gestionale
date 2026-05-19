-- Estensione enum stati lavorazione: slot configurabili via Impostazioni (label/colore in app_settings).
-- Per aggiungere ulteriori stati business: duplicare il blocco ALTER TYPE sotto.

do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'stato_lavorazione' and e.enumlabel = 'custom_1'
  ) then
    alter type public.stato_lavorazione add value 'custom_1';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'stato_lavorazione' and e.enumlabel = 'custom_2'
  ) then
    alter type public.stato_lavorazione add value 'custom_2';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'stato_lavorazione' and e.enumlabel = 'custom_3'
  ) then
    alter type public.stato_lavorazione add value 'custom_3';
  end if;
end $$;
