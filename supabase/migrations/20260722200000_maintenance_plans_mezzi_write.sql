-- Preset tagliandi: write da Mezzi (non più Impostazioni)

CREATE OR REPLACE FUNCTION public.rbac_maintenance_plans_mezzi_write()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.rbac_user_page_access_level(public.rbac_auth_uid(), 'mezzi') = 'write';
$$;

-- ponytail: alias legacy — tutte le policy esistenti puntano qui
CREATE OR REPLACE FUNCTION public.rbac_maintenance_plans_settings_write()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.rbac_maintenance_plans_mezzi_write();
$$;
