-- Verifica post-backfill Maintenance Engine v2 (eseguire su staging/prod dopo migration 20261021120000)

-- Duplicati config preset
SELECT mezzo_id, preset_id, COUNT(*)
FROM vehicle_maintenance_configs
WHERE deleted_at IS NULL AND preset_id IS NOT NULL
GROUP BY mezzo_id, preset_id
HAVING COUNT(*) > 1;

-- Duplicati config custom
SELECT mezzo_id, maintenance_kind, COUNT(*)
FROM vehicle_maintenance_configs
WHERE deleted_at IS NULL AND preset_id IS NULL
GROUP BY mezzo_id, maintenance_kind
HAVING COUNT(*) > 1;

-- Esecuzioni senza config_id
SELECT COUNT(*) AS services_without_config_id
FROM vehicle_maintenance_services
WHERE config_id IS NULL AND plan_id IS NOT NULL;

-- Mezzi con storico ma senza config
SELECT COUNT(DISTINCT s.mezzo_id) AS mezzi_storico_senza_config
FROM vehicle_maintenance_services s
WHERE NOT EXISTS (
  SELECT 1 FROM vehicle_maintenance_configs vmc
  WHERE vmc.mezzo_id = s.mezzo_id AND vmc.deleted_at IS NULL
);
