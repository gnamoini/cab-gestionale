-- Tagliandi: modulo sempre attivo — rimuove feature flag da app_settings.

DELETE FROM public.app_settings
WHERE module = 'system' AND key = 'maintenance_plans_v1';

CREATE OR REPLACE FUNCTION public.maintenance_plans_v1_db_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true;
$$;
