-- VIN unicità: colonna normalizzata STORED + unique index parziale.
-- I-VIN-2: telaio_num_norm = upper(trim(telaio_num)) quando valorizzato.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.mezzi
    WHERE trim(coalesce(telaio_num, '')) <> ''
    GROUP BY upper(trim(telaio_num))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'mezzi.telaio_num: duplicati legacy dopo UPPER(TRIM). Risolvere prima della migration VIN.';
  END IF;
END $$;

ALTER TABLE public.mezzi
  ADD COLUMN IF NOT EXISTS telaio_num_norm text
  GENERATED ALWAYS AS (
    CASE
      WHEN telaio_num IS NULL OR trim(telaio_num) = '' THEN NULL
      ELSE upper(trim(telaio_num))
    END
  ) STORED;

COMMENT ON COLUMN public.mezzi.telaio_num_norm IS
  'VIN canonico UPPER(TRIM(telaio_num))); usato per unique index. Read-only generated.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_mezzi_telaio_num_norm_unique
  ON public.mezzi (telaio_num_norm)
  WHERE telaio_num_norm IS NOT NULL AND telaio_num_norm <> '';
