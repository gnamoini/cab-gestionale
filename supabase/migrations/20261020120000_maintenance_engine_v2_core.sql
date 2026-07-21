-- Maintenance Planning Engine v2 — schema additive (retrocompat con maintenance_plans v1)

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.maintenance_interval_type AS ENUM ('ore', 'km', 'giorni');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_kind AS ENUM (
    'tagliando_ore',
    'tagliando_km',
    'revisione',
    'controllo_idraulico',
    'filtri',
    'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_override_scope AS ENUM ('generic', 'model', 'vehicle');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_replacement_condition AS ENUM (
    'sempre',
    'solo_se_usurato',
    'solo_se_contaminato',
    'ogni_n_tagliandi',
    'ogni_n_ore',
    'ogni_n_km'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_forecast_trigger AS ENUM (
    'execution_registered',
    'cron_batch',
    'manual_recompute'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_confidence_level AS ENUM ('alta', 'media', 'bassa');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_document_kind AS ENUM ('foto', 'allegato', 'report', 'manuale');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_kpi_scope AS ENUM ('mezzo', 'preset', 'officina');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_warehouse_status AS ENUM ('pending', 'reserved', 'issued', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Gerarchia preset
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.maintenance_preset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_preset_categories_label_nonempty CHECK (char_length(trim(label)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_maintenance_preset_categories_label
  ON public.maintenance_preset_categories (lower(trim(label)));

DROP TRIGGER IF EXISTS maintenance_preset_categories_set_updated_at ON public.maintenance_preset_categories;
CREATE TRIGGER maintenance_preset_categories_set_updated_at
BEFORE UPDATE ON public.maintenance_preset_categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.maintenance_preset_manufacturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.maintenance_preset_categories(id) ON DELETE RESTRICT,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_preset_manufacturers_label_nonempty CHECK (char_length(trim(label)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_maintenance_preset_manufacturers_cat_label
  ON public.maintenance_preset_manufacturers (category_id, lower(trim(label)));

DROP TRIGGER IF EXISTS maintenance_preset_manufacturers_set_updated_at ON public.maintenance_preset_manufacturers;
CREATE TRIGGER maintenance_preset_manufacturers_set_updated_at
BEFORE UPDATE ON public.maintenance_preset_manufacturers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.maintenance_preset_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES public.maintenance_preset_manufacturers(id) ON DELETE RESTRICT,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_preset_models_label_nonempty CHECK (char_length(trim(label)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_maintenance_preset_models_mfr_label
  ON public.maintenance_preset_models (manufacturer_id, lower(trim(label)));

DROP TRIGGER IF EXISTS maintenance_preset_models_set_updated_at ON public.maintenance_preset_models;
CREATE TRIGGER maintenance_preset_models_set_updated_at
BEFORE UPDATE ON public.maintenance_preset_models
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Evoluzione maintenance_plans (preset)
-- ---------------------------------------------------------------------------

ALTER TABLE public.maintenance_plans
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.maintenance_preset_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manufacturer_id uuid REFERENCES public.maintenance_preset_manufacturers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.maintenance_preset_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_preset_id uuid REFERENCES public.maintenance_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS override_scope public.maintenance_override_scope NOT NULL DEFAULT 'generic',
  ADD COLUMN IF NOT EXISTS interval_type public.maintenance_interval_type NOT NULL DEFAULT 'ore',
  ADD COLUMN IF NOT EXISTS interval_value numeric,
  ADD COLUMN IF NOT EXISTS current_version_id uuid,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maintenance_kind public.maintenance_kind NOT NULL DEFAULT 'tagliando_ore';

UPDATE public.maintenance_plans
SET interval_value = interval_ore
WHERE interval_value IS NULL;

CREATE OR REPLACE VIEW public.maintenance_presets AS
SELECT * FROM public.maintenance_plans;

-- ---------------------------------------------------------------------------
-- Preset versions (documentazione tecnica)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.maintenance_preset_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  manual_name text,
  manufacturer_ref text,
  revision text,
  page_ref text,
  document_id uuid REFERENCES public.documenti(id) ON DELETE SET NULL,
  change_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT maintenance_preset_versions_version_pos CHECK (version_number > 0),
  CONSTRAINT maintenance_preset_versions_unique UNIQUE (preset_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_maintenance_preset_versions_preset
  ON public.maintenance_preset_versions (preset_id, version_number DESC);

DO $$ BEGIN
  ALTER TABLE public.maintenance_plans
    ADD CONSTRAINT maintenance_plans_current_version_fk
    FOREIGN KEY (current_version_id) REFERENCES public.maintenance_preset_versions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Preset overrides
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.maintenance_preset_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_preset_id uuid NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  child_preset_id uuid NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  scope public.maintenance_override_scope NOT NULL DEFAULT 'model',
  model_id uuid REFERENCES public.maintenance_preset_models(id) ON DELETE CASCADE,
  mezzo_id uuid REFERENCES public.mezzi(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_preset_overrides_distinct CHECK (parent_preset_id <> child_preset_id)
);

CREATE INDEX IF NOT EXISTS idx_maintenance_preset_overrides_parent
  ON public.maintenance_preset_overrides (parent_preset_id);

-- ---------------------------------------------------------------------------
-- Evoluzione maintenance_plan_parts
-- ---------------------------------------------------------------------------

ALTER TABLE public.maintenance_plan_parts
  ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS replacement_condition public.maintenance_replacement_condition NOT NULL DEFAULT 'sempre',
  ADD COLUMN IF NOT EXISTS condition_params jsonb,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS preset_version_id uuid REFERENCES public.maintenance_preset_versions(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Vehicle maintenance configs (N per mezzo)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mezzo_id uuid NOT NULL REFERENCES public.mezzi(id) ON DELETE CASCADE,
  preset_id uuid REFERENCES public.maintenance_plans(id) ON DELETE SET NULL,
  preset_version_id uuid REFERENCES public.maintenance_preset_versions(id) ON DELETE SET NULL,
  maintenance_kind public.maintenance_kind NOT NULL DEFAULT 'tagliando_ore',
  is_active boolean NOT NULL DEFAULT true,
  interval_type public.maintenance_interval_type NOT NULL DEFAULT 'ore',
  interval_value numeric NOT NULL,
  label text,
  activated_at date,
  deactivated_at date,
  planned_lavorazione_id uuid REFERENCES public.lavorazioni(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT vehicle_maintenance_configs_interval_pos CHECK (interval_value > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vmc_mezzo_preset_active
  ON public.vehicle_maintenance_configs (mezzo_id, preset_id)
  WHERE deleted_at IS NULL AND preset_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vmc_mezzo_kind_custom
  ON public.vehicle_maintenance_configs (mezzo_id, maintenance_kind)
  WHERE deleted_at IS NULL AND preset_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_vmc_mezzo_active
  ON public.vehicle_maintenance_configs (mezzo_id, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vmc_interval_active
  ON public.vehicle_maintenance_configs (interval_type, interval_value, is_active)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS vehicle_maintenance_configs_set_updated_at ON public.vehicle_maintenance_configs;
CREATE TRIGGER vehicle_maintenance_configs_set_updated_at
BEFORE UPDATE ON public.vehicle_maintenance_configs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Evoluzione vehicle_maintenance_services (executions)
-- ---------------------------------------------------------------------------

ALTER TABLE public.vehicle_maintenance_services
  ADD COLUMN IF NOT EXISTS config_id uuid REFERENCES public.vehicle_maintenance_configs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preset_version_id uuid REFERENCES public.maintenance_preset_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS interval_type public.maintenance_interval_type,
  ADD COLUMN IF NOT EXISTS interval_value_at_execution numeric,
  ADD COLUMN IF NOT EXISTS km_at_service numeric,
  ADD COLUMN IF NOT EXISTS milestone_reached numeric,
  ADD COLUMN IF NOT EXISTS lavorazione_id uuid REFERENCES public.lavorazioni(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheda_lavorazione_id uuid REFERENCES public.scheda_lavorazione(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS anomaly_note text,
  ADD COLUMN IF NOT EXISTS confidence_at_execution public.maintenance_confidence_level,
  ADD COLUMN IF NOT EXISTS total_cost numeric;

CREATE INDEX IF NOT EXISTS idx_vms_config_performed
  ON public.vehicle_maintenance_services (config_id, performed_at DESC)
  WHERE config_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Evoluzione vehicle_maintenance_service_parts
-- ---------------------------------------------------------------------------

ALTER TABLE public.vehicle_maintenance_service_parts
  ADD COLUMN IF NOT EXISTS was_replaced boolean,
  ADD COLUMN IF NOT EXISTS was_due boolean,
  ADD COLUMN IF NOT EXISTS replacement_condition public.maintenance_replacement_condition,
  ADD COLUMN IF NOT EXISTS is_required_snapshot boolean,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS stock_transaction_id uuid,
  ADD COLUMN IF NOT EXISTS warehouse_status public.maintenance_warehouse_status NOT NULL DEFAULT 'pending';

-- ---------------------------------------------------------------------------
-- Forecast latest + history
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_forecasts (
  config_id uuid PRIMARY KEY REFERENCES public.vehicle_maintenance_configs(id) ON DELETE CASCADE,
  computed_at timestamptz NOT NULL DEFAULT now(),
  next_date_estimated date,
  next_milestone_value numeric,
  remaining_value numeric,
  confidence_level public.maintenance_confidence_level NOT NULL DEFAULT 'bassa',
  confidence_pct integer NOT NULL DEFAULT 0,
  confidence_reason text NOT NULL DEFAULT '',
  ema_rate_per_day numeric,
  observation_count integer NOT NULL DEFAULT 0,
  variance numeric,
  stddev numeric,
  engine_version text NOT NULL DEFAULT 'v2.0'
);

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_forecast_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.vehicle_maintenance_configs(id) ON DELETE CASCADE,
  computed_at timestamptz NOT NULL DEFAULT now(),
  next_date_estimated date,
  next_milestone_value numeric,
  remaining_value numeric,
  confidence_level public.maintenance_confidence_level NOT NULL DEFAULT 'bassa',
  confidence_pct integer NOT NULL DEFAULT 0,
  confidence_reason text NOT NULL DEFAULT '',
  ema_rate_per_day numeric,
  observation_count integer NOT NULL DEFAULT 0,
  variance numeric,
  stddev numeric,
  engine_version text NOT NULL DEFAULT 'v2.0',
  trigger public.maintenance_forecast_trigger NOT NULL DEFAULT 'manual_recompute'
);

CREATE INDEX IF NOT EXISTS idx_vmfh_config_computed
  ON public.vehicle_maintenance_forecast_history (config_id, computed_at DESC);

-- ---------------------------------------------------------------------------
-- Execution documents
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.vehicle_maintenance_services(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documenti(id) ON DELETE CASCADE,
  kind public.maintenance_document_kind NOT NULL DEFAULT 'allegato',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_maintenance_documents_unique UNIQUE (service_id, document_id)
);

-- ---------------------------------------------------------------------------
-- KPI snapshots
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_kpi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope public.maintenance_kpi_scope NOT NULL,
  scope_id uuid,
  period_start date NOT NULL,
  period_end date NOT NULL,
  metrics_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_maintenance_kpi_snapshots_period CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_vmks_scope_period
  ON public.vehicle_maintenance_kpi_snapshots (scope, scope_id, period_start DESC);

-- ---------------------------------------------------------------------------
-- Feature flag v2
-- ---------------------------------------------------------------------------

INSERT INTO public.app_settings (module, key, value)
VALUES ('system', 'maintenance_engine_v2', '{"enabled": true}'::jsonb)
ON CONFLICT (module, key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Backfill: preset versions v1 + interval_value
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_plan record;
  v_version_id uuid;
BEGIN
  FOR v_plan IN
    SELECT id, nome, interval_ore, is_active, maintenance_kind, interval_type, interval_value
    FROM public.maintenance_plans
    WHERE deleted_at IS NULL
  LOOP
    UPDATE public.maintenance_plans
    SET
      interval_value = COALESCE(interval_value, interval_ore),
      interval_type = COALESCE(interval_type, 'ore'::public.maintenance_interval_type)
    WHERE id = v_plan.id;

    IF NOT EXISTS (
      SELECT 1 FROM public.maintenance_preset_versions pv WHERE pv.preset_id = v_plan.id
    ) THEN
      INSERT INTO public.maintenance_preset_versions (
        preset_id, version_number, snapshot_json, change_note
      )
      VALUES (
        v_plan.id,
        1,
        jsonb_build_object(
          'nome', v_plan.nome,
          'intervalOre', v_plan.interval_ore,
          'isActive', v_plan.is_active
        ),
        'v2 backfill — versione iniziale'
      )
      RETURNING id INTO v_version_id;

      UPDATE public.maintenance_plans
      SET current_version_id = v_version_id
      WHERE id = v_plan.id AND current_version_id IS NULL;
    END IF;
  END LOOP;
END $$;
