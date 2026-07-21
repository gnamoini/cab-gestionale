-- Maintenance Engine v2 — RBAC + RLS

CREATE OR REPLACE FUNCTION public.rbac_lifecycle_mezzo_id(p_table text, p_record_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mezzo_id uuid;
BEGIN
  CASE p_table
    WHEN 'asset_compliance_rules' THEN
      SELECT CASE
        WHEN r.asset_kind = 'mezzo' THEN r.mezzo_id
        ELSE a.mezzo_id
      END INTO v_mezzo_id
      FROM public.asset_compliance_rules r
      LEFT JOIN public.attrezzature a ON a.id = r.attrezzatura_id
      WHERE r.id = p_record_id;
    WHEN 'asset_compliance_records' THEN
      SELECT CASE
        WHEN rec.asset_kind = 'mezzo' THEN rec.mezzo_id
        ELSE a.mezzo_id
      END INTO v_mezzo_id
      FROM public.asset_compliance_records rec
      LEFT JOIN public.attrezzature a ON a.id = rec.attrezzatura_id
      WHERE rec.id = p_record_id;
    WHEN 'asset_assignment_history' THEN
      SELECT h.mezzo_id INTO v_mezzo_id
      FROM public.asset_assignment_history h
      WHERE h.id = p_record_id;
    WHEN 'asset_mileage_readings' THEN
      SELECT m.mezzo_id INTO v_mezzo_id
      FROM public.asset_mileage_readings m
      WHERE m.id = p_record_id;
    WHEN 'vehicle_maintenance_services' THEN
      SELECT s.mezzo_id INTO v_mezzo_id
      FROM public.vehicle_maintenance_services s
      WHERE s.id = p_record_id;
    WHEN 'vehicle_maintenance_configs' THEN
      SELECT c.mezzo_id INTO v_mezzo_id
      FROM public.vehicle_maintenance_configs c
      WHERE c.id = p_record_id;
    WHEN 'vehicle_maintenance_forecasts' THEN
      SELECT c.mezzo_id INTO v_mezzo_id
      FROM public.vehicle_maintenance_forecasts f
      JOIN public.vehicle_maintenance_configs c ON c.id = f.config_id
      WHERE f.config_id = p_record_id;
    WHEN 'vehicle_maintenance_forecast_history' THEN
      SELECT c.mezzo_id INTO v_mezzo_id
      FROM public.vehicle_maintenance_forecast_history h
      JOIN public.vehicle_maintenance_configs c ON c.id = h.config_id
      WHERE h.id = p_record_id;
    ELSE
      v_mezzo_id := NULL;
  END CASE;
  RETURN v_mezzo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rbac_resource_to_module(p_resource text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE coalesce(p_resource, '')
    WHEN 'mezzi' THEN 'mezzi'
    WHEN 'attrezzature' THEN 'mezzi'
    WHEN 'asset_compliance_rules' THEN 'mezzi'
    WHEN 'asset_compliance_records' THEN 'mezzi'
    WHEN 'asset_assignment_history' THEN 'mezzi'
    WHEN 'asset_mileage_readings' THEN 'mezzi'
    WHEN 'vehicle_maintenance_services' THEN 'mezzi'
    WHEN 'vehicle_maintenance_service_parts' THEN 'mezzi'
    WHEN 'vehicle_maintenance_configs' THEN 'mezzi'
    WHEN 'vehicle_maintenance_forecasts' THEN 'mezzi'
    WHEN 'vehicle_maintenance_forecast_history' THEN 'mezzi'
    WHEN 'vehicle_maintenance_documents' THEN 'mezzi'
    WHEN 'vehicle_maintenance_kpi_snapshots' THEN 'mezzi'
    WHEN 'maintenance_plans' THEN 'mezzi'
    WHEN 'maintenance_plan_parts' THEN 'mezzi'
    WHEN 'maintenance_plan_equipment_types' THEN 'mezzi'
    WHEN 'maintenance_preset_categories' THEN 'mezzi'
    WHEN 'maintenance_preset_manufacturers' THEN 'mezzi'
    WHEN 'maintenance_preset_models' THEN 'mezzi'
    WHEN 'maintenance_preset_versions' THEN 'mezzi'
    WHEN 'maintenance_preset_overrides' THEN 'mezzi'
    WHEN 'tipi_attrezzatura_catalog' THEN 'mezzi'
    WHEN 'lavorazioni' THEN 'lavorazioni'
    WHEN 'scheda_lavorazione' THEN 'lavorazioni'
    WHEN 'magazzino' THEN 'magazzino'
    WHEN 'magazzino_ricambi' THEN 'magazzino'
    WHEN 'movimenti_ricambi' THEN 'magazzino'
    WHEN 'documenti' THEN 'documenti'
    WHEN 'preventivi' THEN 'preventivi'
    WHEN 'report' THEN 'report'
    WHEN 'billing_customers' THEN 'fatturazione'
    WHEN 'invoices' THEN 'fatturazione'
    WHEN 'invoice_rows' THEN 'fatturazione'
    WHEN 'invoice_links' THEN 'fatturazione'
    WHEN 'invoice_payments' THEN 'fatturazione'
    WHEN 'ddt_documents' THEN 'ddt'
    WHEN 'ddt_rows' THEN 'ddt'
    WHEN 'ddt_links' THEN 'ddt'
    WHEN 'ordini_fornitori' THEN 'ordini_fornitori'
    WHEN 'ordini_fornitori_righe' THEN 'ordini_fornitori'
    WHEN 'ordini_fornitori_links' THEN 'ordini_fornitori'
    ELSE null
  END;
$$;

-- RLS enable new tables
ALTER TABLE public.maintenance_preset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_preset_manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_preset_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_preset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_preset_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance_forecast_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance_kpi_snapshots ENABLE ROW LEVEL SECURITY;

-- preset hierarchy (settings write)
DROP POLICY IF EXISTS cap_mpc_select ON public.maintenance_preset_categories;
CREATE POLICY cap_mpc_select ON public.maintenance_preset_categories FOR SELECT TO authenticated
USING (public.rbac_module_can('mezzi', 'read'));

DROP POLICY IF EXISTS cap_mpc_write ON public.maintenance_preset_categories;
CREATE POLICY cap_mpc_write ON public.maintenance_preset_categories FOR ALL TO authenticated
USING (public.rbac_maintenance_plans_settings_write())
WITH CHECK (public.rbac_maintenance_plans_settings_write());

DROP POLICY IF EXISTS cap_mpm_select ON public.maintenance_preset_manufacturers;
CREATE POLICY cap_mpm_select ON public.maintenance_preset_manufacturers FOR SELECT TO authenticated
USING (public.rbac_module_can('mezzi', 'read'));

DROP POLICY IF EXISTS cap_mpm_write ON public.maintenance_preset_manufacturers;
CREATE POLICY cap_mpm_write ON public.maintenance_preset_manufacturers FOR ALL TO authenticated
USING (public.rbac_maintenance_plans_settings_write())
WITH CHECK (public.rbac_maintenance_plans_settings_write());

DROP POLICY IF EXISTS cap_mpmodel_select ON public.maintenance_preset_models;
CREATE POLICY cap_mpmodel_select ON public.maintenance_preset_models FOR SELECT TO authenticated
USING (public.rbac_module_can('mezzi', 'read'));

DROP POLICY IF EXISTS cap_mpmodel_write ON public.maintenance_preset_models;
CREATE POLICY cap_mpmodel_write ON public.maintenance_preset_models FOR ALL TO authenticated
USING (public.rbac_maintenance_plans_settings_write())
WITH CHECK (public.rbac_maintenance_plans_settings_write());

DROP POLICY IF EXISTS cap_mpv_select ON public.maintenance_preset_versions;
CREATE POLICY cap_mpv_select ON public.maintenance_preset_versions FOR SELECT TO authenticated
USING (public.rbac_module_can('mezzi', 'read'));

DROP POLICY IF EXISTS cap_mpv_write ON public.maintenance_preset_versions;
CREATE POLICY cap_mpv_write ON public.maintenance_preset_versions FOR ALL TO authenticated
USING (public.rbac_maintenance_plans_settings_write())
WITH CHECK (public.rbac_maintenance_plans_settings_write());

DROP POLICY IF EXISTS cap_mpo_select ON public.maintenance_preset_overrides;
CREATE POLICY cap_mpo_select ON public.maintenance_preset_overrides FOR SELECT TO authenticated
USING (public.rbac_module_can('mezzi', 'read'));

DROP POLICY IF EXISTS cap_mpo_write ON public.maintenance_preset_overrides;
CREATE POLICY cap_mpo_write ON public.maintenance_preset_overrides FOR ALL TO authenticated
USING (public.rbac_maintenance_plans_settings_write())
WITH CHECK (public.rbac_maintenance_plans_settings_write());

-- vehicle configs (mezzi write)
DROP POLICY IF EXISTS cap_vmc_select ON public.vehicle_maintenance_configs;
CREATE POLICY cap_vmc_select ON public.vehicle_maintenance_configs FOR SELECT TO authenticated
USING (public.rbac_can_read_row('vehicle_maintenance_configs', id));

DROP POLICY IF EXISTS cap_vmc_insert ON public.vehicle_maintenance_configs;
CREATE POLICY cap_vmc_insert ON public.vehicle_maintenance_configs FOR INSERT TO authenticated
WITH CHECK (public.rbac_module_can('mezzi', 'write'));

DROP POLICY IF EXISTS cap_vmc_update ON public.vehicle_maintenance_configs;
CREATE POLICY cap_vmc_update ON public.vehicle_maintenance_configs FOR UPDATE TO authenticated
USING (public.rbac_module_can('mezzi', 'write'))
WITH CHECK (public.rbac_module_can('mezzi', 'write'));

DROP POLICY IF EXISTS cap_vmc_delete ON public.vehicle_maintenance_configs;
CREATE POLICY cap_vmc_delete ON public.vehicle_maintenance_configs FOR DELETE TO authenticated
USING (public.rbac_module_can('mezzi', 'write'));

-- forecasts (read via config scope; write mezzi)
DROP POLICY IF EXISTS cap_vmf_select ON public.vehicle_maintenance_forecasts;
CREATE POLICY cap_vmf_select ON public.vehicle_maintenance_forecasts FOR SELECT TO authenticated
USING (public.rbac_can_read_row('vehicle_maintenance_forecasts', config_id));

DROP POLICY IF EXISTS cap_vmf_write ON public.vehicle_maintenance_forecasts;
CREATE POLICY cap_vmf_write ON public.vehicle_maintenance_forecasts FOR ALL TO authenticated
USING (public.rbac_module_can('mezzi', 'write'))
WITH CHECK (public.rbac_module_can('mezzi', 'write'));

DROP POLICY IF EXISTS cap_vmfh_select ON public.vehicle_maintenance_forecast_history;
CREATE POLICY cap_vmfh_select ON public.vehicle_maintenance_forecast_history FOR SELECT TO authenticated
USING (public.rbac_can_read_row('vehicle_maintenance_forecast_history', id));

DROP POLICY IF EXISTS cap_vmfh_write ON public.vehicle_maintenance_forecast_history;
CREATE POLICY cap_vmfh_write ON public.vehicle_maintenance_forecast_history FOR INSERT TO authenticated
WITH CHECK (public.rbac_module_can('mezzi', 'write'));

DROP POLICY IF EXISTS cap_vmd_select ON public.vehicle_maintenance_documents;
CREATE POLICY cap_vmd_select ON public.vehicle_maintenance_documents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vehicle_maintenance_services s
    WHERE s.id = service_id
      AND public.rbac_can_read_row('vehicle_maintenance_services', s.id)
  )
);

DROP POLICY IF EXISTS cap_vmd_write ON public.vehicle_maintenance_documents;
CREATE POLICY cap_vmd_write ON public.vehicle_maintenance_documents FOR ALL TO authenticated
USING (public.rbac_module_can('mezzi', 'write'))
WITH CHECK (public.rbac_module_can('mezzi', 'write'));

DROP POLICY IF EXISTS cap_vmks_select ON public.vehicle_maintenance_kpi_snapshots;
CREATE POLICY cap_vmks_select ON public.vehicle_maintenance_kpi_snapshots FOR SELECT TO authenticated
USING (public.rbac_module_can('mezzi', 'read'));

DROP POLICY IF EXISTS cap_vmks_write ON public.vehicle_maintenance_kpi_snapshots;
CREATE POLICY cap_vmks_write ON public.vehicle_maintenance_kpi_snapshots FOR ALL TO authenticated
USING (public.rbac_module_can('mezzi', 'write'))
WITH CHECK (public.rbac_module_can('mezzi', 'write'));

-- Notification type forecast 7g
INSERT INTO public.notification_type_registry (
  type, allowed_scope_type, allowed_scope_value, allowed_scope_module, default_priority, caller_min_role
)
SELECT
  'tagliando_previsto_7g',
  'role',
  'admin',
  'mezzi',
  'high',
  'staff'
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_type_registry WHERE type = 'tagliando_previsto_7g'
);
