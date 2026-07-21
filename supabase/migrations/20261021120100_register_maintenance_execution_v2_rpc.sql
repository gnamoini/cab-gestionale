-- Maintenance Engine v2 — registrazione esecuzione atomica (service + parts + forecast + history)

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
  p_parts jsonb,
  p_forecast jsonb
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
    mezzo_id,
    plan_id,
    config_id,
    preset_version_id,
    performed_at,
    ore_at_service,
    km_at_service,
    mezzo_ore_snapshot,
    interval_type,
    interval_value_at_execution,
    milestone_reached,
    note,
    anomaly_note,
    lavorazione_id,
    scheda_lavorazione_id,
    performed_by,
    created_by
  )
  VALUES (
    p_mezzo_id,
    p_plan_id,
    p_config_id,
    p_preset_version_id,
    p_performed_at,
    p_ore_at_service,
    p_km_at_service,
    p_mezzo_ore_snapshot,
    p_interval_type,
    p_interval_value_at_execution,
    p_ore_at_service,
    NULLIF(trim(p_note), ''),
    NULLIF(trim(p_anomaly_note), ''),
    p_lavorazione_id,
    p_scheda_lavorazione_id,
    v_uid,
    v_uid
  )
  RETURNING id INTO v_service_id;

  IF p_parts IS NOT NULL AND jsonb_typeof(p_parts) = 'array' THEN
    FOR v_part IN SELECT value FROM jsonb_array_elements(p_parts)
    LOOP
      INSERT INTO public.vehicle_maintenance_service_parts (
        service_id,
        ricambio_id,
        quantita,
        descrizione_snapshot,
        was_replaced,
        was_due,
        replacement_condition,
        is_required_snapshot,
        note
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
        NULLIF(v_part->>'note', '')
      );
    END LOOP;
  END IF;

  IF p_forecast IS NOT NULL AND jsonb_typeof(p_forecast) = 'object' THEN
    INSERT INTO public.vehicle_maintenance_forecasts (
      config_id,
      computed_at,
      next_date_estimated,
      next_milestone_value,
      remaining_value,
      confidence_level,
      confidence_pct,
      confidence_reason,
      ema_rate_per_day,
      observation_count,
      variance,
      stddev,
      engine_version
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
      COALESCE(p_forecast->>'engine_version', 'ema-v1')
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
      engine_version = EXCLUDED.engine_version;

    INSERT INTO public.vehicle_maintenance_forecast_history (
      config_id,
      computed_at,
      next_date_estimated,
      next_milestone_value,
      remaining_value,
      confidence_level,
      confidence_pct,
      confidence_reason,
      ema_rate_per_day,
      observation_count,
      variance,
      stddev,
      engine_version,
      trigger
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
      COALESCE(p_forecast->>'engine_version', 'ema-v1'),
      'execution_registered'::public.maintenance_forecast_trigger
    );
  END IF;

  RETURN v_service_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_maintenance_execution_v2(
  uuid, uuid, uuid, date, numeric, numeric, numeric, text, text, uuid, uuid, uuid,
  public.maintenance_interval_type, numeric, jsonb, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_maintenance_execution_v2(
  uuid, uuid, uuid, date, numeric, numeric, numeric, text, text, uuid, uuid, uuid,
  public.maintenance_interval_type, numeric, jsonb, jsonb
) TO authenticated;
