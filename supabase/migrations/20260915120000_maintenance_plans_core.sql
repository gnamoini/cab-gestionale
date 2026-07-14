-- Maintenance Plans — tagliandi operativi ore-based (dominio separato da asset_compliance)

-- ---------------------------------------------------------------------------
-- 0. Catalogo tipi attrezzatura (FK stabile per junction piani)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tipi_attrezzatura_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  label_norm text GENERATED ALWAYS AS (lower(trim(label))) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tipi_attrezzatura_catalog_label_nonempty CHECK (char_length(trim(label)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tipi_attrezzatura_catalog_label_norm
  ON public.tipi_attrezzatura_catalog (label_norm);

DROP TRIGGER IF EXISTS tipi_attrezzatura_catalog_set_updated_at ON public.tipi_attrezzatura_catalog;
CREATE TRIGGER tipi_attrezzatura_catalog_set_updated_at
BEFORE UPDATE ON public.tipi_attrezzatura_catalog
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 1. Piani tagliando
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.maintenance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  interval_ore integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT maintenance_plans_nome_nonempty CHECK (char_length(trim(nome)) > 0),
  CONSTRAINT maintenance_plans_interval_ore_pos CHECK (interval_ore > 0)
);

DROP TRIGGER IF EXISTS maintenance_plans_set_updated_at ON public.maintenance_plans;
CREATE TRIGGER maintenance_plans_set_updated_at
BEFORE UPDATE ON public.maintenance_plans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_maintenance_plans_active
  ON public.maintenance_plans (is_active)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Junction piano ↔ tipo attrezzatura
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.maintenance_plan_equipment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  tipo_attrezzatura_id uuid NOT NULL REFERENCES public.tipi_attrezzatura_catalog(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_plan_equipment_types_unique UNIQUE (plan_id, tipo_attrezzatura_id)
);

CREATE INDEX IF NOT EXISTS idx_mp_equipment_types_plan
  ON public.maintenance_plan_equipment_types (plan_id);

CREATE INDEX IF NOT EXISTS idx_mp_equipment_types_tipo
  ON public.maintenance_plan_equipment_types (tipo_attrezzatura_id);

-- ---------------------------------------------------------------------------
-- 3. Ricambi previsti per piano
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.maintenance_plan_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  ricambio_id uuid NOT NULL REFERENCES public.magazzino_ricambi(id) ON DELETE RESTRICT,
  quantita numeric(14, 3) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_plan_parts_quantita_pos CHECK (quantita > 0),
  CONSTRAINT maintenance_plan_parts_unique UNIQUE (plan_id, ricambio_id)
);

DROP TRIGGER IF EXISTS maintenance_plan_parts_set_updated_at ON public.maintenance_plan_parts;
CREATE TRIGGER maintenance_plan_parts_set_updated_at
BEFORE UPDATE ON public.maintenance_plan_parts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_maintenance_plan_parts_plan
  ON public.maintenance_plan_parts (plan_id);

-- ---------------------------------------------------------------------------
-- 4. Esecuzioni tagliando sul mezzo
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mezzo_id uuid NOT NULL REFERENCES public.mezzi(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE RESTRICT,
  performed_at date NOT NULL,
  ore_at_service numeric NOT NULL,
  mezzo_ore_snapshot numeric,
  note text,
  performed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT vehicle_maintenance_services_ore_nonneg CHECK (ore_at_service >= 0),
  CONSTRAINT vehicle_maintenance_services_snapshot_nonneg CHECK (mezzo_ore_snapshot IS NULL OR mezzo_ore_snapshot >= 0)
);

DROP TRIGGER IF EXISTS vehicle_maintenance_services_set_updated_at ON public.vehicle_maintenance_services;
CREATE TRIGGER vehicle_maintenance_services_set_updated_at
BEFORE UPDATE ON public.vehicle_maintenance_services
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_vms_mezzo_plan_ore
  ON public.vehicle_maintenance_services (mezzo_id, plan_id, ore_at_service DESC);

CREATE INDEX IF NOT EXISTS idx_vms_mezzo_performed
  ON public.vehicle_maintenance_services (mezzo_id, performed_at DESC, created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. Ricambi consumati per esecuzione
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_service_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.vehicle_maintenance_services(id) ON DELETE CASCADE,
  ricambio_id uuid NOT NULL REFERENCES public.magazzino_ricambi(id) ON DELETE RESTRICT,
  quantita numeric(14, 3) NOT NULL,
  descrizione_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_maintenance_service_parts_quantita_pos CHECK (quantita > 0),
  CONSTRAINT vehicle_maintenance_service_parts_unique UNIQUE (service_id, ricambio_id)
);

CREATE INDEX IF NOT EXISTS idx_vmsp_service
  ON public.vehicle_maintenance_service_parts (service_id);

-- ---------------------------------------------------------------------------
-- Seed catalogo tipi (idempotente)
-- ---------------------------------------------------------------------------

INSERT INTO public.tipi_attrezzatura_catalog (label)
VALUES
  ('Spazzatrice stradale'),
  ('Compattatore rifiuti'),
  ('Autospazzatrice cabinata'),
  ('Lavastrade'),
  ('Ape raccolta rifiuti'),
  ('Ape spazzatrice'),
  ('Scarrabile'),
  ('Porter elettrico'),
  ('Multicarro'),
  ('Semirimorchio'),
  ('Motrice 4 assi'),
  ('Officina mobile')
ON CONFLICT (label_norm) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed piano spazzatrice 500h
-- ponytail: ricambi associati solo se codice esiste in magazzino — nessun placeholder
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_plan_id uuid;
  v_tipo_id uuid;
  v_ricambio_id uuid;
  v_codice text;
  v_qty numeric;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.maintenance_plans
    WHERE nome = 'Tagliando spazzatrice 500 ore' AND deleted_at IS NULL
  ) THEN
    INSERT INTO public.maintenance_plans (nome, interval_ore, is_active)
    VALUES ('Tagliando spazzatrice 500 ore', 500, true);
  END IF;

  SELECT id INTO v_plan_id
  FROM public.maintenance_plans
  WHERE nome = 'Tagliando spazzatrice 500 ore' AND deleted_at IS NULL
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RETURN;
  END IF;

  FOR v_tipo_id IN
    SELECT c.id
    FROM public.tipi_attrezzatura_catalog c
    WHERE c.label_norm IN (
      lower(trim('Spazzatrice stradale')),
      lower(trim('Autospazzatrice cabinata')),
      lower(trim('Ape spazzatrice'))
    )
  LOOP
    INSERT INTO public.maintenance_plan_equipment_types (plan_id, tipo_attrezzatura_id)
    VALUES (v_plan_id, v_tipo_id)
    ON CONFLICT (plan_id, tipo_attrezzatura_id) DO NOTHING;
  END LOOP;

  -- Ricambi opzionali: solo lookup per codice esistente (nessun INSERT in magazzino)
  FOR v_codice, v_qty IN
    SELECT * FROM (VALUES
      ('TAG-FILTRO-OLIO', 1::numeric),
      ('TAG-FILTRO-ARIA', 1::numeric),
      ('TAG-OLIO-MOTORE', 8::numeric)
    ) AS t(codice, qty)
  LOOP
    SELECT r.id INTO v_ricambio_id
    FROM public.magazzino_ricambi r
    WHERE r.codice = v_codice
    LIMIT 1;

    IF v_ricambio_id IS NOT NULL THEN
      INSERT INTO public.maintenance_plan_parts (plan_id, ricambio_id, quantita)
      VALUES (v_plan_id, v_ricambio_id, v_qty)
      ON CONFLICT (plan_id, ricambio_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Piano creato. Ricambi da associare manualmente in Impostazioni se codici assenti.

-- ---------------------------------------------------------------------------
-- Feature flag (default OFF)
-- ---------------------------------------------------------------------------

INSERT INTO public.app_settings (module, key, value)
VALUES (
  'system',
  'maintenance_plans_v1',
  '{"enabled": false}'::jsonb
)
ON CONFLICT (module, key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.maintenance_plans_v1_db_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (value->>'enabled')::boolean
     FROM public.app_settings
     WHERE module = 'system' AND key = 'maintenance_plans_v1'),
    false
  );
$$;
