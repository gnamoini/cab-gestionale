-- Pre/post migration audit — maintenance preset decouple
-- Run manually or via CI before deploy gate.

-- 1. Mezzi with legacy tagliandi flag but no active config
SELECT m.id, m.numero_scuderia, m.targa, m.meta->>'tagliandi' AS tagliandi_flag
FROM mezzi m
WHERE m.meta->>'tagliandi' = 'true'
  AND NOT EXISTS (
    SELECT 1 FROM vehicle_maintenance_configs c
    WHERE c.mezzo_id = m.id
      AND c.deleted_at IS NULL
      AND c.is_active = true
  );

-- 2. Presets without trigger groups (expect zero post-backfill)
SELECT p.id, p.nome
FROM maintenance_plans p
WHERE p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM maintenance_preset_trigger_groups g WHERE g.preset_id = p.id
  );

-- 3. Orphan configs (expect zero)
SELECT c.id, c.mezzo_id, c.preset_id
FROM vehicle_maintenance_configs c
LEFT JOIN maintenance_plans p ON p.id = c.preset_id
WHERE c.preset_id IS NOT NULL
  AND c.deleted_at IS NULL
  AND p.id IS NULL;
