-- Asset Lifecycle — mileage readings + sync mezzi.km cache (M5)

CREATE TABLE IF NOT EXISTS public.asset_mileage_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mezzo_id uuid NOT NULL REFERENCES public.mezzi(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  km numeric NOT NULL CHECK (km >= 0),
  source public.mileage_source NOT NULL,
  lavorazione_id uuid REFERENCES public.lavorazioni(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mileage_mezzo_recorded
  ON public.asset_mileage_readings (mezzo_id, recorded_at DESC);

CREATE OR REPLACE FUNCTION public.sync_mezzo_km_from_reading()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mezzi
  SET km = NEW.km, updated_at = now()
  WHERE id = NEW.mezzo_id
    AND (km IS NULL OR NEW.km >= km OR NEW.source = 'correction');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS asset_mileage_readings_sync_mezzo_km ON public.asset_mileage_readings;
CREATE TRIGGER asset_mileage_readings_sync_mezzo_km
AFTER INSERT ON public.asset_mileage_readings
FOR EACH ROW EXECUTE FUNCTION public.sync_mezzo_km_from_reading();
