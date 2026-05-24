-- Allinea scheda_lavorazione alla definizione schema (updated_at + trigger OCC).
-- Necessario perché 20260211120000 creò la tabella senza updated_at e
-- 20260211140000 non ha potuto aggiungere la colonna (IF NOT EXISTS).

ALTER TABLE public.scheda_lavorazione
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.scheda_lavorazione
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public.scheda_lavorazione
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS trg_scheda_lavorazione_updated_at ON public.scheda_lavorazione;
CREATE TRIGGER trg_scheda_lavorazione_updated_at
  BEFORE UPDATE ON public.scheda_lavorazione
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON COLUMN public.scheda_lavorazione.updated_at IS
  'Timestamp ultima modifica; usato da schedeService.update per OCC.';
