-- SSOT note lavorazioni: rimuove noteIntervento dal JSON scheda ingresso (dopo backfill verify).

UPDATE public.scheda_lavorazione
SET contenuto = contenuto #- '{doc,campi,noteIntervento}'
WHERE tipo = 'ingresso'
  AND contenuto #>> '{doc,campi,noteIntervento}' IS NOT NULL;

DO $$
DECLARE
  remaining bigint;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM public.scheda_lavorazione
  WHERE tipo = 'ingresso'
    AND contenuto #>> '{doc,campi,noteIntervento}' IS NOT NULL;

  IF remaining > 0 THEN
    RAISE EXCEPTION 'lavorazioni_note_ssot_strip: % schede ingresso con noteIntervento residuo', remaining;
  END IF;
END $$;
