-- ponytail: ultimo_* = cache stato corrente mezzo (V1). Storico completo = asset_mileage_readings / V2 futuro.
ALTER TABLE public.mezzi ADD COLUMN IF NOT EXISTS ultimo_km_rilevato numeric;
ALTER TABLE public.mezzi ADD COLUMN IF NOT EXISTS ultimo_km_data timestamptz;
ALTER TABLE public.mezzi ADD COLUMN IF NOT EXISTS ultimo_ore_rilevate numeric;
ALTER TABLE public.mezzi ADD COLUMN IF NOT EXISTS ultimo_ore_data timestamptz;
ALTER TABLE public.mezzi ADD COLUMN IF NOT EXISTS ultimo_aggiornamento_da_lavorazione_id uuid
  REFERENCES public.lavorazioni(id) ON DELETE SET NULL;

UPDATE public.mezzi
SET
  ultimo_km_rilevato = COALESCE(ultimo_km_rilevato, km),
  ultimo_km_data = COALESCE(ultimo_km_data, updated_at),
  ultimo_ore_rilevate = COALESCE(
    ultimo_ore_rilevate,
    NULLIF((meta->>'oreKm')::numeric, 0)
  ),
  ultimo_ore_data = COALESCE(ultimo_ore_data, updated_at)
WHERE ultimo_km_rilevato IS NULL OR ultimo_ore_rilevate IS NULL;
