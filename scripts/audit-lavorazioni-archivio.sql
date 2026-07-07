-- Audit membership archivio lavorazioni (read-only).
-- Uso: eseguire su staging/prod con ruolo service o SQL editor.

-- Conteggi base
select
  count(*) filter (where archived = false and deleted_at is null) as attive_db,
  count(*) filter (where archived = true and deleted_at is null) as archivio_db,
  count(*) filter (where deleted_at is not null) as soft_deleted
from public.lavorazioni;

-- Anomalia: completata ma non archiviata (resta in lista attive by design workflow)
select id, codice, stato, archived, archived_at, updated_at
from public.lavorazioni
where deleted_at is null
  and archived = false
  and stato = 'completata'
order by updated_at desc
limit 50;

-- Anomalia: archiviata senza timestamp
select id, codice, stato, archived, archived_at, updated_at
from public.lavorazioni
where deleted_at is null
  and archived = true
  and archived_at is null
limit 50;

-- Verifica singola lavorazione (sostituire :lav_id)
-- select id, stato, archived, archived_at, data_uscita, updated_at
-- from public.lavorazioni
-- where id = :lav_id;
