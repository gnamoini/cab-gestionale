-- SSOT note lavorazioni: backfill da scheda ingresso + audit conflitti (vince lavorazioni.note).

CREATE TABLE IF NOT EXISTS public.audit_note_ssot_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lavorazione_id uuid NOT NULL REFERENCES public.lavorazioni(id) ON DELETE CASCADE,
  lavorazione_note text,
  scheda_note text,
  resolution text NOT NULL DEFAULT 'db_wins',
  migrated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_note_ssot_conflicts_lavorazione
  ON public.audit_note_ssot_conflicts (lavorazione_id);

-- Backfill: scheda ha note, lavorazione vuota
UPDATE public.lavorazioni l
SET note = nullif(trim(s.contenuto #>> '{doc,campi,noteIntervento}'), '')
FROM public.scheda_lavorazione s
WHERE s.lavorazione_id = l.id
  AND s.tipo = 'ingresso'
  AND (l.note IS NULL OR trim(l.note) = '')
  AND nullif(trim(s.contenuto #>> '{doc,campi,noteIntervento}'), '') IS NOT NULL;

-- Conflitti: entrambe valorizzate e diverse — mantiene l.note, registra audit
INSERT INTO public.audit_note_ssot_conflicts (lavorazione_id, lavorazione_note, scheda_note, resolution)
SELECT
  l.id,
  l.note,
  nullif(trim(s.contenuto #>> '{doc,campi,noteIntervento}'), ''),
  'db_wins'
FROM public.lavorazioni l
JOIN public.scheda_lavorazione s ON s.lavorazione_id = l.id AND s.tipo = 'ingresso'
WHERE nullif(trim(l.note), '') IS NOT NULL
  AND nullif(trim(s.contenuto #>> '{doc,campi,noteIntervento}'), '') IS NOT NULL
  AND trim(l.note) IS DISTINCT FROM trim(s.contenuto #>> '{doc,campi,noteIntervento}');

-- Verify gate: nessuna riga con note DB vuota e scheda ancora valorizzata
DO $$
DECLARE
  orphan_count bigint;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM public.lavorazioni l
  JOIN public.scheda_lavorazione s ON s.lavorazione_id = l.id AND s.tipo = 'ingresso'
  WHERE (l.note IS NULL OR trim(l.note) = '')
    AND nullif(trim(s.contenuto #>> '{doc,campi,noteIntervento}'), '') IS NOT NULL;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'lavorazioni_note_ssot_backfill: % righe con noteIntervento in scheda ma lavorazioni.note vuota', orphan_count;
  END IF;
END $$;
