-- UNIQUE globale su targa normalizzata (post-bonifica duplicati).

CREATE UNIQUE INDEX IF NOT EXISTS idx_mezzi_targa_norm_unique
ON public.mezzi (lower(replace(replace(replace(trim(targa), ' ', ''), '-', ''), '/', '')))
WHERE targa IS NOT NULL AND trim(targa) <> '';

COMMENT ON INDEX public.idx_mezzi_targa_norm_unique IS
  'Unicità globale targa normalizzata (strip spazi/trattini, lower).';
