-- Maintenance Engine v2 — idempotent backfill configs + link storico esecuzioni

-- 1) Config da esecuzioni esistenti (mezzo + plan)
INSERT INTO public.vehicle_maintenance_configs (
  mezzo_id,
  preset_id,
  preset_version_id,
  maintenance_kind,
  is_active,
  interval_type,
  interval_value,
  label,
  activated_at
)
SELECT
  s.mezzo_id,
  s.plan_id,
  mp.current_version_id,
  COALESCE(mp.maintenance_kind, 'tagliando_ore'::public.maintenance_kind),
  true,
  COALESCE(mp.interval_type, 'ore'::public.maintenance_interval_type),
  COALESCE(mp.interval_value, mp.interval_ore::numeric),
  mp.nome,
  MIN(s.performed_at)::date
FROM public.vehicle_maintenance_services s
JOIN public.maintenance_plans mp ON mp.id = s.plan_id AND mp.deleted_at IS NULL
WHERE s.plan_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.vehicle_maintenance_configs vmc
    WHERE vmc.mezzo_id = s.mezzo_id
      AND vmc.preset_id = s.plan_id
      AND vmc.deleted_at IS NULL
  )
GROUP BY
  s.mezzo_id,
  s.plan_id,
  mp.current_version_id,
  mp.maintenance_kind,
  mp.interval_type,
  mp.interval_value,
  mp.interval_ore,
  mp.nome;

-- 2) Collega config_id su esecuzioni legacy
UPDATE public.vehicle_maintenance_services s
SET config_id = vmc.id
FROM public.vehicle_maintenance_configs vmc
WHERE s.config_id IS NULL
  AND s.plan_id IS NOT NULL
  AND vmc.mezzo_id = s.mezzo_id
  AND vmc.preset_id = s.plan_id
  AND vmc.deleted_at IS NULL;

-- 3) Config per mezzi tagliandi-enabled senza config (match tipo attrezzatura primaria)
DO $$
DECLARE
  v_mezzo record;
  v_plan record;
  v_tipo_id uuid;
  v_attrezzatura_tipo text;
BEGIN
  FOR v_mezzo IN
    SELECT m.id
    FROM public.mezzi m
    WHERE COALESCE(m.meta->>'tagliandi', '') IN ('true', 't', '1')
       OR EXISTS (
         SELECT 1 FROM public.vehicle_maintenance_services s WHERE s.mezzo_id = m.id
       )
  LOOP
    SELECT a.tipo_attrezzatura
    INTO v_attrezzatura_tipo
    FROM public.attrezzature a
    WHERE a.mezzo_id = v_mezzo.id
    ORDER BY a.created_at ASC
    LIMIT 1;

    IF v_attrezzatura_tipo IS NULL OR char_length(trim(v_attrezzatura_tipo)) = 0 THEN
      CONTINUE;
    END IF;

    SELECT tac.id
    INTO v_tipo_id
    FROM public.tipi_attrezzatura_catalog tac
    WHERE lower(trim(tac.label)) = lower(trim(v_attrezzatura_tipo))
    LIMIT 1;

    IF v_tipo_id IS NULL THEN
      CONTINUE;
    END IF;

    FOR v_plan IN
      SELECT
        mp.id,
        mp.nome,
        mp.current_version_id,
        mp.maintenance_kind,
        mp.interval_type,
        COALESCE(mp.interval_value, mp.interval_ore::numeric) AS interval_value
      FROM public.maintenance_plans mp
      JOIN public.maintenance_plan_equipment_types mpet ON mpet.plan_id = mp.id
      WHERE mp.deleted_at IS NULL
        AND mp.is_active = true
        AND mpet.tipo_attrezzatura_id = v_tipo_id
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM public.vehicle_maintenance_configs vmc
        WHERE vmc.mezzo_id = v_mezzo.id
          AND vmc.preset_id = v_plan.id
          AND vmc.deleted_at IS NULL
      ) THEN
        INSERT INTO public.vehicle_maintenance_configs (
          mezzo_id,
          preset_id,
          preset_version_id,
          maintenance_kind,
          is_active,
          interval_type,
          interval_value,
          label,
          activated_at
        )
        VALUES (
          v_mezzo.id,
          v_plan.id,
          v_plan.current_version_id,
          COALESCE(v_plan.maintenance_kind, 'tagliando_ore'::public.maintenance_kind),
          true,
          COALESCE(v_plan.interval_type, 'ore'::public.maintenance_interval_type),
          v_plan.interval_value,
          v_plan.nome,
          CURRENT_DATE
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;
