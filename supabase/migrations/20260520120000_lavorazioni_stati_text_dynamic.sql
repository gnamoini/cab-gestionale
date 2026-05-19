-- Stati e priorità lavorazione: da enum PostgreSQL a TEXT (configurazione dinamica via app_settings).
-- Gestisce la view public.lavorazioni_clienti che dipende da lavorazioni.stato / lavorazioni.priorita.

begin;

-- ---------------------------------------------------------------------------
-- 1. Rimuovi view dipendente (ricreata identica al termine)
-- ---------------------------------------------------------------------------
drop view if exists public.lavorazioni_clienti cascade;

-- ---------------------------------------------------------------------------
-- 2. Converti colonne enum → TEXT (idempotente: salta se già text)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'lavorazioni'
      and c.column_name = 'stato'
      and c.udt_name <> 'text'
  ) then
    alter table public.lavorazioni
      alter column stato type text using stato::text;
  end if;

  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'lavorazioni'
      and c.column_name = 'priorita'
      and c.udt_name <> 'text'
  ) then
    alter table public.lavorazioni
      alter column priorita type text using priorita::text;
  end if;
end $$;

-- Normalizza valore legacy priorità (enum storico «normale»)
update public.lavorazioni
set priorita = 'media'
where priorita = 'normale';

-- ---------------------------------------------------------------------------
-- 3. Default e vincoli colonna
-- ---------------------------------------------------------------------------
alter table public.lavorazioni
  alter column stato set default 'accettazione';

alter table public.lavorazioni
  alter column priorita set default 'media';

alter table public.lavorazioni
  alter column stato set not null;

alter table public.lavorazioni
  alter column priorita set not null;

-- ---------------------------------------------------------------------------
-- 4. Elimina enum PostgreSQL (non più referenziati dopo conversione TEXT)
-- ---------------------------------------------------------------------------
drop type if exists public.stato_lavorazione;
drop type if exists public.priorita_lavorazione;

-- ---------------------------------------------------------------------------
-- 5. Ricrea view portale clienti (security invoker → eredita RLS tabelle base)
--    Definizione allineata a 20260518180000_rls_security_hardening.sql
-- ---------------------------------------------------------------------------
create or replace view public.lavorazioni_clienti
with (security_invoker = true) as
select
  l.id,
  l.mezzo_id,
  l.stato,
  l.priorita,
  l.data_ingresso,
  l.data_uscita,
  l.note,
  l.created_by,
  l.created_at,
  l.updated_at,
  m.cliente,
  m.utilizzatore,
  m.marca,
  m.modello,
  m.targa,
  m.matricola,
  m.numero_scuderia,
  m.anno
from public.lavorazioni l
inner join public.mezzi m on m.id = l.mezzo_id;

comment on view public.lavorazioni_clienti is
  'Portale clienti: join lavorazioni/mezzi; RLS ereditato dalle tabelle sottostanti.';

grant select on public.lavorazioni_clienti to authenticated;

commit;
