-- Permette più ricambi senza codice OE (codice = '').
-- Backfill legacy AUTO-* e segnaposto — senza toccare entity_key.

ALTER TABLE public.magazzino_ricambi
  DROP CONSTRAINT IF EXISTS magazzino_ricambi_codice_unique;

ALTER TABLE public.magazzino_ricambi
  DROP CONSTRAINT IF EXISTS magazzino_ricambi_codice_uq;

UPDATE public.magazzino_ricambi
SET codice = ''
WHERE codice LIKE 'AUTO-%'
   OR trim(codice) = '—';

CREATE UNIQUE INDEX IF NOT EXISTS idx_magazzino_ricambi_codice_nonempty
  ON public.magazzino_ricambi (codice)
  WHERE trim(codice) <> '';

CREATE INDEX IF NOT EXISTS idx_magazzino_ricambi_codice_search
  ON public.magazzino_ricambi (codice);
