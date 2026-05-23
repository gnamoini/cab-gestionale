-- Global Validation Layer: chiave normalizzata opzionale per dedupe cross-modulo.
-- Non bloccante: nessun vincolo UNIQUE obbligatorio su mezzi (identità composita).

ALTER TABLE public.mezzi
  ADD COLUMN IF NOT EXISTS entity_key text;

ALTER TABLE public.magazzino_ricambi
  ADD COLUMN IF NOT EXISTS entity_key text;

CREATE INDEX IF NOT EXISTS idx_mezzi_entity_key
  ON public.mezzi (entity_key)
  WHERE entity_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_magazzino_ricambi_entity_key
  ON public.magazzino_ricambi (entity_key)
  WHERE entity_key IS NOT NULL;

COMMENT ON COLUMN public.mezzi.entity_key IS 'Chiave canonica normalizzata (identità mezzo) per dedupe e ricerca.';
COMMENT ON COLUMN public.magazzino_ricambi.entity_key IS 'Chiave canonica normalizzata (codice ricambio) per dedupe e ricerca.';
