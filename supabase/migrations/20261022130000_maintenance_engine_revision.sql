-- Maintenance Engine revision — P0 (integrity) + P1 (triggers, explainability) + P2 schema

-- ---------------------------------------------------------------------------
-- P0 enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.maintenance_preset_status AS ENUM ('active', 'draft', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_execution_type AS ENUM ('scheduled', 'corrective', 'manual', 'emergency');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_trigger_group_operator AS ENUM ('OR', 'AND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE public.maintenance_interval_type ADD VALUE IF NOT EXISTS 'mesi';

ALTER TYPE public.maintenance_warehouse_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.maintenance_warehouse_status ADD VALUE IF NOT EXISTS 'failed';
ALTER TYPE public.maintenance_warehouse_status ADD VALUE IF NOT EXISTS 'ignored';

-- ---------------------------------------------------------------------------
-- P0 columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.maintenance_plans
  ADD COLUMN IF NOT EXISTS status public.maintenance_preset_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS tempo_previsto_minuti integer,
  ADD COLUMN IF NOT EXISTS manodopera_costo_orario numeric;

UPDATE public.maintenance_plans
SET status = CASE
  WHEN deleted_at IS NOT NULL OR is_active = false THEN 'archived'::public.maintenance_preset_status
  ELSE 'active'::public.maintenance_preset_status
END
WHERE status IS NULL OR status = 'active';

ALTER TABLE public.vehicle_maintenance_services
  ADD COLUMN IF NOT EXISTS execution_type public.maintenance_execution_type NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS preset_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.vehicle_maintenance_forecasts
  ADD COLUMN IF NOT EXISTS trigger_reason text,
  ADD COLUMN IF NOT EXISTS explainability_json jsonb;

-- ---------------------------------------------------------------------------
-- P0 audit
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.maintenance_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_audit_events_entity
  ON public.maintenance_audit_events (entity, entity_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- P1 trigger groups
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.maintenance_preset_trigger_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  operator public.maintenance_trigger_group_operator NOT NULL DEFAULT 'OR',
  sort_order integer NOT NULL DEFAULT 0,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance_preset_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.maintenance_preset_trigger_groups(id) ON DELETE CASCADE,
  trigger_type public.maintenance_interval_type NOT NULL,
  threshold numeric NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_preset_triggers_threshold_pos CHECK (threshold > 0),
  CONSTRAINT maintenance_preset_triggers_unique_type UNIQUE (group_id, trigger_type)
);

CREATE INDEX IF NOT EXISTS idx_maintenance_preset_trigger_groups_preset
  ON public.maintenance_preset_trigger_groups (preset_id, sort_order);

DROP TRIGGER IF EXISTS maintenance_preset_trigger_groups_set_updated_at ON public.maintenance_preset_trigger_groups;
CREATE TRIGGER maintenance_preset_trigger_groups_set_updated_at
BEFORE UPDATE ON public.maintenance_preset_trigger_groups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- P2 checklist + documents
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.maintenance_preset_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_preset_checklist_label_nonempty CHECK (char_length(trim(label)) > 0)
);

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_service_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.vehicle_maintenance_services(id) ON DELETE CASCADE,
  item_label text NOT NULL,
  checked boolean NOT NULL DEFAULT false,
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance_preset_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documenti(id) ON DELETE CASCADE,
  label text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_preset_documents_unique UNIQUE (preset_id, document_id)
);

-- ---------------------------------------------------------------------------
-- Backfill: one OR trigger group per preset
-- ---------------------------------------------------------------------------

INSERT INTO public.maintenance_preset_trigger_groups (preset_id, operator, sort_order, label)
SELECT p.id, 'OR'::public.maintenance_trigger_group_operator, 0, 'Intervallo principale'
FROM public.maintenance_plans p
WHERE NOT EXISTS (
  SELECT 1 FROM public.maintenance_preset_trigger_groups g WHERE g.preset_id = p.id
);

INSERT INTO public.maintenance_preset_triggers (group_id, trigger_type, threshold, priority)
SELECT g.id,
  COALESCE(p.interval_type, 'ore'::public.maintenance_interval_type),
  COALESCE(p.interval_value, p.interval_ore, 500),
  0
FROM public.maintenance_preset_trigger_groups g
JOIN public.maintenance_plans p ON p.id = g.preset_id
WHERE g.sort_order = 0
  AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_preset_triggers t WHERE t.group_id = g.id
  );

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.maintenance_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_preset_trigger_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_preset_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_preset_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance_service_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_preset_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maintenance_audit_events_select ON public.maintenance_audit_events;
CREATE POLICY maintenance_audit_events_select ON public.maintenance_audit_events
  FOR SELECT TO authenticated
  USING (public.rbac_maintenance_plans_settings_write() OR public.rbac_can_write('mezzi'));

DROP POLICY IF EXISTS maintenance_audit_events_insert ON public.maintenance_audit_events;
CREATE POLICY maintenance_audit_events_insert ON public.maintenance_audit_events
  FOR INSERT TO authenticated
  WITH CHECK (public.rbac_maintenance_plans_settings_write() OR public.rbac_can_write('mezzi'));

DROP POLICY IF EXISTS maintenance_trigger_groups_select ON public.maintenance_preset_trigger_groups;
CREATE POLICY maintenance_trigger_groups_select ON public.maintenance_preset_trigger_groups
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS maintenance_trigger_groups_write ON public.maintenance_preset_trigger_groups;
CREATE POLICY maintenance_trigger_groups_write ON public.maintenance_preset_trigger_groups
  FOR ALL TO authenticated
  USING (public.rbac_maintenance_plans_settings_write())
  WITH CHECK (public.rbac_maintenance_plans_settings_write());

DROP POLICY IF EXISTS maintenance_triggers_select ON public.maintenance_preset_triggers;
CREATE POLICY maintenance_triggers_select ON public.maintenance_preset_triggers
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS maintenance_triggers_write ON public.maintenance_preset_triggers;
CREATE POLICY maintenance_triggers_write ON public.maintenance_preset_triggers
  FOR ALL TO authenticated
  USING (public.rbac_maintenance_plans_settings_write())
  WITH CHECK (public.rbac_maintenance_plans_settings_write());

DROP POLICY IF EXISTS maintenance_checklist_select ON public.maintenance_preset_checklist_items;
CREATE POLICY maintenance_checklist_select ON public.maintenance_preset_checklist_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS maintenance_checklist_write ON public.maintenance_preset_checklist_items;
CREATE POLICY maintenance_checklist_write ON public.maintenance_preset_checklist_items
  FOR ALL TO authenticated
  USING (public.rbac_maintenance_plans_settings_write())
  WITH CHECK (public.rbac_maintenance_plans_settings_write());

DROP POLICY IF EXISTS maintenance_service_checklist_select ON public.vehicle_maintenance_service_checklist;
CREATE POLICY maintenance_service_checklist_select ON public.vehicle_maintenance_service_checklist
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicle_maintenance_services s
      WHERE s.id = service_id AND public.rbac_can_read_row('vehicle_maintenance_services', s.id)
    )
  );

DROP POLICY IF EXISTS maintenance_service_checklist_write ON public.vehicle_maintenance_service_checklist;
CREATE POLICY maintenance_service_checklist_write ON public.vehicle_maintenance_service_checklist
  FOR INSERT TO authenticated
  WITH CHECK (public.rbac_can_write('mezzi'));

DROP POLICY IF EXISTS maintenance_preset_documents_select ON public.maintenance_preset_documents;
CREATE POLICY maintenance_preset_documents_select ON public.maintenance_preset_documents
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS maintenance_preset_documents_write ON public.maintenance_preset_documents;
CREATE POLICY maintenance_preset_documents_write ON public.maintenance_preset_documents
  FOR ALL TO authenticated
  USING (public.rbac_maintenance_plans_settings_write())
  WITH CHECK (public.rbac_maintenance_plans_settings_write());

-- ---------------------------------------------------------------------------
-- RPC: execution with snapshot + execution_type
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.register_maintenance_execution_v2(
  p_config_id uuid,
  p_mezzo_id uuid,
  p_plan_id uuid,
  p_performed_at date,
  p_ore_at_service numeric,
  p_km_at_service numeric,
  p_mezzo_ore_snapshot numeric,
  p_note text,
  p_anomaly_note text,
  p_lavorazione_id uuid,
  p_scheda_lavorazione_id uuid,
  p_preset_version_id uuid,
  p_interval_type public.maintenance_interval_type,
  p_interval_value_at_execution numeric,
  p_execution_type public.maintenance_execution_type,
  p_preset_snapshot jsonb,
  p_parts jsonb,
  p_forecast jsonb,
  p_checklist jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_service_id uuid;
  v_part jsonb;
  v_item jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  IF NOT public.rbac_can_write('mezzi') THEN
    RAISE EXCEPTION 'Permesso negato';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_maintenance_configs c
    WHERE c.id = p_config_id AND c.mezzo_id = p_mezzo_id AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Config non trovata';
  END IF;

  INSERT INTO public.vehicle_maintenance_services (
    mezzo_id, plan_id, config_id, preset_version_id,
    performed_at, ore_at_service, km_at_service, mezzo_ore_snapshot,
    interval_type, interval_value_at_execution, milestone_reached,
    note, anomaly_note, lavorazione_id, scheda_lavorazione_id,
    execution_type, preset_snapshot,
    performed_by, created_by
  )
  VALUES (
    p_mezzo_id, p_plan_id, p_config_id, p_preset_version_id,
    p_performed_at, p_ore_at_service, p_km_at_service, p_mezzo_ore_snapshot,
    p_interval_type, p_interval_value_at_execution, p_ore_at_service,
    NULLIF(trim(p_note), ''), NULLIF(trim(p_anomaly_note), ''),
    p_lavorazione_id, p_scheda_lavorazione_id,
    COALESCE(p_execution_type, 'scheduled'::public.maintenance_execution_type),
    COALESCE(p_preset_snapshot, '{}'::jsonb),
    v_uid, v_uid
  )
  RETURNING id INTO v_service_id;

  IF p_parts IS NOT NULL AND jsonb_typeof(p_parts) = 'array' THEN
    FOR v_part IN SELECT value FROM jsonb_array_elements(p_parts)
    LOOP
      INSERT INTO public.vehicle_maintenance_service_parts (
        service_id, ricambio_id, quantita, descrizione_snapshot,
        was_replaced, was_due, replacement_condition, is_required_snapshot, note,
        warehouse_status
      )
      VALUES (
        v_service_id,
        (v_part->>'ricambio_id')::uuid,
        COALESCE((v_part->>'quantita')::numeric, 1),
        NULLIF(v_part->>'descrizione_snapshot', ''),
        COALESCE((v_part->>'was_replaced')::boolean, false),
        COALESCE((v_part->>'was_due')::boolean, true),
        COALESCE((v_part->>'replacement_condition')::public.maintenance_replacement_condition, 'sempre'),
        COALESCE((v_part->>'is_required_snapshot')::boolean, true),
        NULLIF(v_part->>'note', ''),
        'pending'::public.maintenance_warehouse_status
      );
    END LOOP;
  END IF;

  IF p_checklist IS NOT NULL AND jsonb_typeof(p_checklist) = 'array' THEN
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_checklist)
    LOOP
      INSERT INTO public.vehicle_maintenance_service_checklist (
        service_id, item_label, checked, note, sort_order
      )
      VALUES (
        v_service_id,
        COALESCE(v_item->>'item_label', ''),
        COALESCE((v_item->>'checked')::boolean, false),
        NULLIF(v_item->>'note', ''),
        COALESCE((v_item->>'sort_order')::integer, 0)
      );
    END LOOP;
  END IF;

  IF p_forecast IS NOT NULL AND jsonb_typeof(p_forecast) = 'object' THEN
    INSERT INTO public.vehicle_maintenance_forecasts (
      config_id, computed_at, next_date_estimated, next_milestone_value, remaining_value,
      confidence_level, confidence_pct, confidence_reason, ema_rate_per_day,
      observation_count, variance, stddev, engine_version,
      trigger_reason, explainability_json
    )
    VALUES (
      p_config_id,
      COALESCE((p_forecast->>'computed_at')::timestamptz, now()),
      NULLIF(p_forecast->>'next_date_estimated', '')::date,
      (p_forecast->>'next_milestone_value')::numeric,
      (p_forecast->>'remaining_value')::numeric,
      COALESCE((p_forecast->>'confidence_level')::public.maintenance_confidence_level, 'bassa'),
      COALESCE((p_forecast->>'confidence_pct')::numeric, 0),
      COALESCE(p_forecast->>'confidence_reason', ''),
      NULLIF(p_forecast->>'ema_rate_per_day', '')::numeric,
      COALESCE((p_forecast->>'observation_count')::integer, 0),
      NULLIF(p_forecast->>'variance', '')::numeric,
      NULLIF(p_forecast->>'stddev', '')::numeric,
      COALESCE(p_forecast->>'engine_version', 'v2.0'),
      NULLIF(p_forecast->>'trigger_reason', ''),
      p_forecast->'explainability_json'
    )
    ON CONFLICT (config_id) DO UPDATE SET
      computed_at = EXCLUDED.computed_at,
      next_date_estimated = EXCLUDED.next_date_estimated,
      next_milestone_value = EXCLUDED.next_milestone_value,
      remaining_value = EXCLUDED.remaining_value,
      confidence_level = EXCLUDED.confidence_level,
      confidence_pct = EXCLUDED.confidence_pct,
      confidence_reason = EXCLUDED.confidence_reason,
      ema_rate_per_day = EXCLUDED.ema_rate_per_day,
      observation_count = EXCLUDED.observation_count,
      variance = EXCLUDED.variance,
      stddev = EXCLUDED.stddev,
      engine_version = EXCLUDED.engine_version,
      trigger_reason = EXCLUDED.trigger_reason,
      explainability_json = EXCLUDED.explainability_json;

    INSERT INTO public.vehicle_maintenance_forecast_history (
      config_id, computed_at, next_date_estimated, next_milestone_value, remaining_value,
      confidence_level, confidence_pct, confidence_reason, ema_rate_per_day,
      observation_count, variance, stddev, engine_version, trigger
    )
    VALUES (
      p_config_id,
      COALESCE((p_forecast->>'computed_at')::timestamptz, now()),
      NULLIF(p_forecast->>'next_date_estimated', '')::date,
      (p_forecast->>'next_milestone_value')::numeric,
      (p_forecast->>'remaining_value')::numeric,
      COALESCE((p_forecast->>'confidence_level')::public.maintenance_confidence_level, 'bassa'),
      COALESCE((p_forecast->>'confidence_pct')::numeric, 0),
      COALESCE(p_forecast->>'confidence_reason', ''),
      NULLIF(p_forecast->>'ema_rate_per_day', '')::numeric,
      COALESCE((p_forecast->>'observation_count')::integer, 0),
      NULLIF(p_forecast->>'variance', '')::numeric,
      NULLIF(p_forecast->>'stddev', '')::numeric,
      COALESCE(p_forecast->>'engine_version', 'v2.0'),
      'execution_registered'::public.maintenance_forecast_trigger
    );
  END IF;

  RETURN v_service_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_maintenance_execution_v2(
  uuid, uuid, uuid, date, numeric, numeric, numeric, text, text, uuid, uuid, uuid,
  public.maintenance_interval_type, numeric, public.maintenance_execution_type, jsonb, jsonb, jsonb, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_maintenance_execution_v2(
  uuid, uuid, uuid, date, numeric, numeric, numeric, text, text, uuid, uuid, uuid,
  public.maintenance_interval_type, numeric, public.maintenance_execution_type, jsonb, jsonb, jsonb, jsonb
) TO authenticated;
