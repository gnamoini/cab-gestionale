-- Asset Lifecycle — feature flag default OFF (M8)

INSERT INTO public.app_settings (module, key, value)
VALUES (
  'system',
  'asset_lifecycle_v1',
  '{"enabled": false, "compliance": false, "assignment_history": false, "mileage_history": false, "timeline_calendar": false}'::jsonb
)
ON CONFLICT (module, key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.asset_lifecycle_v1_db_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (value->>'enabled')::boolean
     FROM public.app_settings
     WHERE module = 'system' AND key = 'asset_lifecycle_v1'),
    false
  );
$$;
