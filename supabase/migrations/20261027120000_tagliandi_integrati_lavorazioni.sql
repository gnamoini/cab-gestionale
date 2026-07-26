-- Tagliandi Integrati SSOT v3 — schema lavorazioni + servizio effettivo + RPC completamento

DO $$ BEGIN
  CREATE TYPE public.maintenance_execution_origin AS ENUM ('automatic', 'migration', 'api');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_execution_kind AS ENUM ('scheduled', 'extraordinary');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.forecast_reset_policy AS ENUM ('full', 'partial', 'none');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- lavorazioni: tre assi indipendenti
-- ---------------------------------------------------------------------------

ALTER TABLE public.lavorazioni
  ADD COLUMN IF NOT EXISTS is_tagliando boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_execution_kind public.maintenance_execution_kind,
  ADD COLUMN IF NOT EXISTS repair_present boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tagliando_preset_ref uuid,
  ADD COLUMN IF NOT EXISTS tagliando_preset_version_ref uuid,
  ADD COLUMN IF NOT EXISTS tagliando_assign_preset_to_mezzo boolean,
  ADD COLUMN IF NOT EXISTS tagliando_no_preset_reason text;

-- ---------------------------------------------------------------------------
-- vehicle_maintenance_services: Servizio Effettivo
-- ---------------------------------------------------------------------------

ALTER TABLE public.vehicle_maintenance_services
  ADD COLUMN IF NOT EXISTS execution_origin public.maintenance_execution_origin NOT NULL DEFAULT 'automatic',
  ADD COLUMN IF NOT EXISTS compliance_auto numeric(5,2),
  ADD COLUMN IF NOT EXISTS compliance_diff_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS compliance_review jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS compliance_algorithm_version text NOT NULL DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS snapshot_schema_version text NOT NULL DEFAULT 'v1.0';

CREATE UNIQUE INDEX IF NOT EXISTS uq_vms_lavorazione_id
  ON public.vehicle_maintenance_services (lavorazione_id)
  WHERE lavorazione_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- VIEW maintenance_events (compliance derivata)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.maintenance_events AS
SELECT
  v.id,
  v.lavorazione_id,
  v.mezzo_id,
  v.performed_at AS data_esecuzione,
  v.ore_at_service AS ore,
  v.km_at_service AS km,
  v.performed_by AS operatore,
  v.compliance_auto,
  v.compliance_review,
  LEAST(
    100::numeric,
    GREATEST(
      0::numeric,
      v.compliance_auto + COALESCE(
        (
          SELECT SUM((adj.value->>'delta')::numeric)
          FROM jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(v.compliance_review->'adjustments') = 'array'
              THEN v.compliance_review->'adjustments'
              ELSE '[]'::jsonb
            END
          ) AS adj(value)
          WHERE COALESCE((v.compliance_review->>'approved')::boolean, false)
        ),
        0::numeric
      )
    )
  ) AS compliance_effective,
  v.compliance_diff_json,
  v.compliance_algorithm_version,
  v.snapshot_schema_version,
  v.preset_snapshot,
  v.execution_origin,
  v.created_at,
  v.updated_at
FROM public.vehicle_maintenance_services v;

-- ---------------------------------------------------------------------------
-- RPC: completamento lavorazione + servizio effettivo atomico
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.complete_lavorazione_tagliando(
  p_lavorazione_id uuid,
  p_mezzo_id uuid,
  p_config_id uuid,
  p_plan_id uuid,
  p_performed_at date,
  p_ore_at_service numeric,
  p_km_at_service numeric,
  p_mezzo_ore_snapshot numeric,
  p_note text,
  p_preset_version_id uuid,
  p_interval_type public.maintenance_interval_type,
  p_interval_value_at_execution numeric,
  p_execution_type public.maintenance_execution_type,
  p_preset_snapshot jsonb,
  p_compliance_auto numeric,
  p_compliance_diff_json jsonb,
  p_compliance_algorithm_version text,
  p_snapshot_schema_version text,
  p_parts jsonb,
  p_checklist jsonb DEFAULT '[]'::jsonb,
  p_forecast jsonb DEFAULT NULL,
  p_skip_forecast boolean DEFAULT false,
  p_no_preset_reason text DEFAULT NULL
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
  v_existing uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  IF NOT public.rbac_can_write('lavorazioni') AND NOT public.rbac_can_write('mezzi') THEN
    RAISE EXCEPTION 'Permesso negato';
  END IF;

  SELECT id INTO v_existing
  FROM public.vehicle_maintenance_services
  WHERE lavorazione_id = p_lavorazione_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  UPDATE public.lavorazioni
  SET
    stato = 'completata',
    tagliando_no_preset_reason = COALESCE(NULLIF(trim(p_no_preset_reason), ''), tagliando_no_preset_reason),
    updated_by = v_uid,
    updated_at = now()
  WHERE id = p_lavorazione_id
    AND mezzo_id = p_mezzo_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lavorazione non trovata';
  END IF;

  INSERT INTO public.vehicle_maintenance_services (
    mezzo_id, plan_id, config_id, preset_version_id,
    performed_at, ore_at_service, km_at_service, mezzo_ore_snapshot,
    interval_type, interval_value_at_execution, milestone_reached,
    note, lavorazione_id,
    execution_type, preset_snapshot,
    execution_origin, compliance_auto, compliance_diff_json, compliance_review,
    compliance_algorithm_version, snapshot_schema_version,
    performed_by, created_by
  )
  VALUES (
    p_mezzo_id,
    p_plan_id,
    p_config_id,
    p_preset_version_id,
    p_performed_at,
    p_ore_at_service,
    COALESCE(p_km_at_service, 0),
    p_mezzo_ore_snapshot,
    p_interval_type,
    p_interval_value_at_execution,
    p_ore_at_service,
    NULLIF(trim(p_note), ''),
    p_lavorazione_id,
    COALESCE(p_execution_type, 'scheduled'::public.maintenance_execution_type),
    COALESCE(p_preset_snapshot, '{}'::jsonb),
    'automatic'::public.maintenance_execution_origin,
    p_compliance_auto,
    COALESCE(p_compliance_diff_json, '{}'::jsonb),
    '{}'::jsonb,
    COALESCE(p_compliance_algorithm_version, 'v1.0'),
    COALESCE(p_snapshot_schema_version, 'v1.0'),
    v_uid,
    v_uid
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
        NULLIF(v_part->>'ricambio_id', '')::uuid,
        COALESCE((v_part->>'quantita')::numeric, 1),
        NULLIF(v_part->>'descrizione_snapshot', ''),
        COALESCE((v_part->>'was_replaced')::boolean, true),
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

  IF NOT p_skip_forecast AND p_forecast IS NOT NULL AND jsonb_typeof(p_forecast) = 'object' AND p_config_id IS NOT NULL THEN
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

REVOKE ALL ON FUNCTION public.complete_lavorazione_tagliando(
  uuid, uuid, uuid, uuid, date, numeric, numeric, numeric, text, uuid,
  public.maintenance_interval_type, numeric, public.maintenance_execution_type,
  jsonb, numeric, jsonb, text, text, jsonb, jsonb, jsonb, boolean, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.complete_lavorazione_tagliando(
  uuid, uuid, uuid, uuid, date, numeric, numeric, numeric, text, uuid,
  public.maintenance_interval_type, numeric, public.maintenance_execution_type,
  jsonb, numeric, jsonb, text, text, jsonb, jsonb, jsonb, boolean, text
) TO authenticated;
