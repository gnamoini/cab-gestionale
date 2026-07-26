-- Backfill storico tagliandi integrati v3

UPDATE public.vehicle_maintenance_services
SET execution_origin = 'migration'::public.maintenance_execution_origin
WHERE execution_origin = 'automatic'::public.maintenance_execution_origin
  AND lavorazione_id IS NULL
  AND created_at < now() - interval '1 minute';

UPDATE public.vehicle_maintenance_services
SET
  snapshot_schema_version = COALESCE(NULLIF(snapshot_schema_version, ''), 'v1.0-backfill'),
  compliance_review = COALESCE(compliance_review, '{}'::jsonb)
WHERE snapshot_schema_version IS NULL OR compliance_review IS NULL;

-- Servizi con lavorazione collegata = automatic (post-migrazione)
UPDATE public.vehicle_maintenance_services
SET execution_origin = 'automatic'::public.maintenance_execution_origin
WHERE lavorazione_id IS NOT NULL
  AND execution_origin = 'migration'::public.maintenance_execution_origin;
