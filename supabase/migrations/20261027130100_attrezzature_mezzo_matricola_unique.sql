-- Vincolo anti-duplicazione: stesso mezzo + stessa matricola normalizzata.
-- Eseguire DOPO 20261027130000_attrezzature_dedup_backfill.sql

CREATE UNIQUE INDEX IF NOT EXISTS idx_attrezzature_mezzo_matricola_norm_unique
ON public.attrezzature (mezzo_id, lower(btrim(matricola)))
WHERE matricola IS NOT NULL AND btrim(matricola) <> '';

COMMENT ON INDEX public.idx_attrezzature_mezzo_matricola_norm_unique IS
  'Impedisce duplicati attrezzatura per (mezzo_id, matricola) case-insensitive. NULL matricola esclusa.';
