-- Maintenance Engine v2 — rollout completo (100%, tutti i ruoli).
INSERT INTO public.app_settings (module, key, value)
VALUES (
  'system',
  'maintenance_engine_v2',
  '{"enabled": true, "percentage": 100, "allowed_roles": []}'::jsonb
)
ON CONFLICT (module, key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();
