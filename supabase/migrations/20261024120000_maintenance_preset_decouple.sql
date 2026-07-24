-- Maintenance preset decouple: drop kind uniqueness, backfill trigger groups, nullable maintenance_kind

-- 1. vehicle_maintenance_configs: maintenance_kind optional, drop custom-kind unique index
DROP INDEX IF EXISTS public.uq_vmc_mezzo_kind_custom;

ALTER TABLE public.vehicle_maintenance_configs
  ALTER COLUMN maintenance_kind DROP NOT NULL;

ALTER TABLE public.vehicle_maintenance_configs
  ALTER COLUMN maintenance_kind DROP DEFAULT;

COMMENT ON COLUMN public.vehicle_maintenance_configs.maintenance_kind IS
  'Deprecated — preset-first model uses preset_id only. Kept for historical rows.';

-- 2. Backfill trigger groups from legacy interval columns where missing
INSERT INTO public.maintenance_preset_trigger_groups (preset_id, operator, sort_order, label)
SELECT p.id, 'OR', 0, 'Intervallo principale'
FROM public.maintenance_plans p
WHERE p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_preset_trigger_groups g WHERE g.preset_id = p.id
  );

INSERT INTO public.maintenance_preset_triggers (group_id, trigger_type, threshold, priority)
SELECT g.id,
       COALESCE(p.interval_type, 'ore'::public.maintenance_interval_type),
       COALESCE(p.interval_value, p.interval_ore::numeric, 500),
       0
FROM public.maintenance_preset_trigger_groups g
JOIN public.maintenance_plans p ON p.id = g.preset_id
WHERE p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_preset_triggers t WHERE t.group_id = g.id
  );

-- 3. maintenance_plan_equipment_types: read-only for runtime (documented; no schema change)
COMMENT ON TABLE public.maintenance_plan_equipment_types IS
  'Legacy junction — audit/history only. Preset assignment no longer depends on equipment type.';
