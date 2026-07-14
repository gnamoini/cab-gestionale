-- Maintenance Plans — RBAC helpers + RLS

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
    ELSE
      v_mezzo_id := NULL;
  END CASE;
  RETURN v_mezzo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rbac_scope_cliente(p_table text, p_record_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref text;
  v_mezzo_id uuid;
BEGIN
  IF NOT public.rbac_is_cliente() THEN
    RETURN true;
  END IF;

  v_ref := public.rbac_cliente_ref();
  IF v_ref IS NULL OR p_record_id IS NULL THEN
    RETURN false;
  END IF;

  CASE p_table
    WHEN 'mezzi' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.mezzi m
        WHERE m.id = p_record_id AND m.cliente = v_ref
      );
    WHEN 'attrezzature' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.attrezzature a
        JOIN public.mezzi m ON m.id = a.mezzo_id
        WHERE a.id = p_record_id AND m.cliente = v_ref
      );
    WHEN 'lavorazioni' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.lavorazioni l
        JOIN public.mezzi m ON m.id = l.mezzo_id
        WHERE l.id = p_record_id AND m.cliente = v_ref
      );
    WHEN 'scheda_lavorazione' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.scheda_lavorazione s
        JOIN public.lavorazioni l ON l.id = s.lavorazione_id
        JOIN public.mezzi m ON m.id = l.mezzo_id
        WHERE s.id = p_record_id AND m.cliente = v_ref
      );
    WHEN 'preventivi' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.preventivi p
        WHERE p.id = p_record_id AND p.cliente = v_ref
      );
    WHEN 'asset_compliance_rules', 'asset_compliance_records', 'asset_assignment_history', 'asset_mileage_readings', 'vehicle_maintenance_services' THEN
      v_mezzo_id := public.rbac_lifecycle_mezzo_id(p_table, p_record_id);
      IF v_mezzo_id IS NULL THEN
        RETURN false;
      END IF;
      RETURN EXISTS (
        SELECT 1 FROM public.mezzi m
        WHERE m.id = v_mezzo_id AND m.cliente = v_ref
      );
    ELSE
      RETURN false;
  END CASE;
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
    WHEN 'maintenance_plans' THEN 'mezzi'
    WHEN 'maintenance_plan_parts' THEN 'mezzi'
    WHEN 'maintenance_plan_equipment_types' THEN 'mezzi'
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

CREATE OR REPLACE FUNCTION public.rbac_can_read_row(p_resource text, p_row_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mezzo_id uuid;
  v_uid uuid;
  v_module text;
BEGIN
  v_uid := public.rbac_auth_uid();

  IF p_resource = 'profiles' THEN
    RETURN public.rbac_has_capability(v_uid, 'can_manage_security')
      OR p_row_id = v_uid;
  END IF;

  v_module := public.rbac_resource_to_module(p_resource);

  IF public.rbac_has_capability(v_uid, 'can_read_operational') THEN
    IF p_resource = 'documenti' AND public.rbac_is_cliente() THEN
      RETURN false;
    END IF;

    IF v_module IS NOT NULL AND NOT public.user_effective_can(v_module, 'read') THEN
      RETURN false;
    END IF;

    IF p_resource = 'lavorazioni' THEN
      SELECT l.mezzo_id INTO v_mezzo_id FROM public.lavorazioni l WHERE l.id = p_row_id LIMIT 1;
      RETURN public.rbac_scope_cliente_lavorazioni_mezzo(v_mezzo_id);
    END IF;

    IF p_resource IN (
      'mezzi', 'attrezzature', 'scheda_lavorazione', 'preventivi',
      'asset_compliance_rules', 'asset_compliance_records',
      'asset_assignment_history', 'asset_mileage_readings',
      'vehicle_maintenance_services'
    ) THEN
      RETURN public.rbac_scope_cliente(p_resource, p_row_id);
    END IF;

    IF p_resource IN (
      'tipi_attrezzatura_catalog', 'maintenance_plans',
      'maintenance_plan_equipment_types', 'maintenance_plan_parts'
    ) THEN
      IF public.rbac_is_cliente() THEN
        RETURN false;
      END IF;
      RETURN true;
    END IF;

    IF p_resource = 'vehicle_maintenance_service_parts' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.vehicle_maintenance_service_parts p
        JOIN public.vehicle_maintenance_services s ON s.id = p.service_id
        WHERE p.id = p_row_id
          AND public.rbac_can_read_row('vehicle_maintenance_services', s.id)
      );
    END IF;

    IF public.rbac_is_cliente() THEN
      RETURN false;
    END IF;

    RETURN true;
  END IF;

  IF public.rbac_has_capability(v_uid, 'can_access_client_area') AND public.rbac_is_cliente() THEN
    IF p_resource = 'lavorazioni' THEN
      RETURN public.rbac_scope_cliente('lavorazioni', p_row_id);
    END IF;
    IF p_resource IN (
      'mezzi', 'attrezzature', 'scheda_lavorazione', 'preventivi',
      'asset_compliance_rules', 'asset_compliance_records',
      'asset_assignment_history', 'asset_mileage_readings',
      'vehicle_maintenance_services'
    ) THEN
      RETURN public.rbac_scope_cliente(p_resource, p_row_id);
    END IF;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.rbac_maintenance_plans_settings_write()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.rbac_user_page_access_level(public.rbac_auth_uid(), 'impostazioni') = 'write';
$$;

-- RLS enable
ALTER TABLE public.tipi_attrezzatura_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plan_equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plan_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance_service_parts ENABLE ROW LEVEL SECURITY;

-- tipi_attrezzatura_catalog
DROP POLICY IF EXISTS cap_tipo_att_cat_select ON public.tipi_attrezzatura_catalog;
CREATE POLICY cap_tipo_att_cat_select ON public.tipi_attrezzatura_catalog FOR SELECT TO authenticated
USING (public.rbac_module_can('mezzi', 'read'));

DROP POLICY IF EXISTS cap_tipo_att_cat_insert ON public.tipi_attrezzatura_catalog;
CREATE POLICY cap_tipo_att_cat_insert ON public.tipi_attrezzatura_catalog FOR INSERT TO authenticated
WITH CHECK (public.rbac_maintenance_plans_settings_write());

DROP POLICY IF EXISTS cap_tipo_att_cat_update ON public.tipi_attrezzatura_catalog;
CREATE POLICY cap_tipo_att_cat_update ON public.tipi_attrezzatura_catalog FOR UPDATE TO authenticated
USING (public.rbac_maintenance_plans_settings_write())
WITH CHECK (public.rbac_maintenance_plans_settings_write());

DROP POLICY IF EXISTS cap_tipo_att_cat_delete ON public.tipi_attrezzatura_catalog;
CREATE POLICY cap_tipo_att_cat_delete ON public.tipi_attrezzatura_catalog FOR DELETE TO authenticated
USING (public.rbac_maintenance_plans_settings_write());

-- maintenance_plans
DROP POLICY IF EXISTS cap_mplan_select ON public.maintenance_plans;
CREATE POLICY cap_mplan_select ON public.maintenance_plans FOR SELECT TO authenticated
USING (public.rbac_module_can('mezzi', 'read'));

DROP POLICY IF EXISTS cap_mplan_insert ON public.maintenance_plans;
CREATE POLICY cap_mplan_insert ON public.maintenance_plans FOR INSERT TO authenticated
WITH CHECK (public.rbac_maintenance_plans_settings_write());

DROP POLICY IF EXISTS cap_mplan_update ON public.maintenance_plans;
CREATE POLICY cap_mplan_update ON public.maintenance_plans FOR UPDATE TO authenticated
USING (public.rbac_maintenance_plans_settings_write())
WITH CHECK (public.rbac_maintenance_plans_settings_write());

DROP POLICY IF EXISTS cap_mplan_delete ON public.maintenance_plans;
CREATE POLICY cap_mplan_delete ON public.maintenance_plans FOR DELETE TO authenticated
USING (public.rbac_maintenance_plans_settings_write());

-- maintenance_plan_equipment_types
DROP POLICY IF EXISTS cap_mp_et_select ON public.maintenance_plan_equipment_types;
CREATE POLICY cap_mp_et_select ON public.maintenance_plan_equipment_types FOR SELECT TO authenticated
USING (public.rbac_module_can('mezzi', 'read'));

DROP POLICY IF EXISTS cap_mp_et_insert ON public.maintenance_plan_equipment_types;
CREATE POLICY cap_mp_et_insert ON public.maintenance_plan_equipment_types FOR INSERT TO authenticated
WITH CHECK (public.rbac_maintenance_plans_settings_write());

DROP POLICY IF EXISTS cap_mp_et_update ON public.maintenance_plan_equipment_types;
CREATE POLICY cap_mp_et_update ON public.maintenance_plan_equipment_types FOR UPDATE TO authenticated
USING (public.rbac_maintenance_plans_settings_write())
WITH CHECK (public.rbac_maintenance_plans_settings_write());

DROP POLICY IF EXISTS cap_mp_et_delete ON public.maintenance_plan_equipment_types;
CREATE POLICY cap_mp_et_delete ON public.maintenance_plan_equipment_types FOR DELETE TO authenticated
USING (public.rbac_maintenance_plans_settings_write());

-- maintenance_plan_parts
DROP POLICY IF EXISTS cap_mplan_parts_select ON public.maintenance_plan_parts;
CREATE POLICY cap_mplan_parts_select ON public.maintenance_plan_parts FOR SELECT TO authenticated
USING (public.rbac_module_can('mezzi', 'read'));

DROP POLICY IF EXISTS cap_mplan_parts_insert ON public.maintenance_plan_parts;
CREATE POLICY cap_mplan_parts_insert ON public.maintenance_plan_parts FOR INSERT TO authenticated
WITH CHECK (public.rbac_maintenance_plans_settings_write());

DROP POLICY IF EXISTS cap_mplan_parts_update ON public.maintenance_plan_parts;
CREATE POLICY cap_mplan_parts_update ON public.maintenance_plan_parts FOR UPDATE TO authenticated
USING (public.rbac_maintenance_plans_settings_write())
WITH CHECK (public.rbac_maintenance_plans_settings_write());

DROP POLICY IF EXISTS cap_mplan_parts_delete ON public.maintenance_plan_parts;
CREATE POLICY cap_mplan_parts_delete ON public.maintenance_plan_parts FOR DELETE TO authenticated
USING (public.rbac_maintenance_plans_settings_write());

-- vehicle_maintenance_services
DROP POLICY IF EXISTS cap_vms_select ON public.vehicle_maintenance_services;
CREATE POLICY cap_vms_select ON public.vehicle_maintenance_services FOR SELECT TO authenticated
USING (public.rbac_can_read_row('vehicle_maintenance_services', id));

DROP POLICY IF EXISTS cap_vms_insert ON public.vehicle_maintenance_services;
CREATE POLICY cap_vms_insert ON public.vehicle_maintenance_services FOR INSERT TO authenticated
WITH CHECK (public.rbac_module_can('mezzi', 'write'));

DROP POLICY IF EXISTS cap_vms_update ON public.vehicle_maintenance_services;
CREATE POLICY cap_vms_update ON public.vehicle_maintenance_services FOR UPDATE TO authenticated
USING (public.rbac_module_can('mezzi', 'write'))
WITH CHECK (public.rbac_module_can('mezzi', 'write'));

DROP POLICY IF EXISTS cap_vms_delete ON public.vehicle_maintenance_services;
CREATE POLICY cap_vms_delete ON public.vehicle_maintenance_services FOR DELETE TO authenticated
USING (public.rbac_module_can('mezzi', 'admin'));

-- vehicle_maintenance_service_parts
DROP POLICY IF EXISTS cap_vmsp_select ON public.vehicle_maintenance_service_parts;
CREATE POLICY cap_vmsp_select ON public.vehicle_maintenance_service_parts FOR SELECT TO authenticated
USING (public.rbac_can_read_row('vehicle_maintenance_service_parts', id));

DROP POLICY IF EXISTS cap_vmsp_insert ON public.vehicle_maintenance_service_parts;
CREATE POLICY cap_vmsp_insert ON public.vehicle_maintenance_service_parts FOR INSERT TO authenticated
WITH CHECK (public.rbac_module_can('mezzi', 'write'));

DROP POLICY IF EXISTS cap_vmsp_update ON public.vehicle_maintenance_service_parts;
CREATE POLICY cap_vmsp_update ON public.vehicle_maintenance_service_parts FOR UPDATE TO authenticated
USING (public.rbac_module_can('mezzi', 'write'))
WITH CHECK (public.rbac_module_can('mezzi', 'write'));

DROP POLICY IF EXISTS cap_vmsp_delete ON public.vehicle_maintenance_service_parts;
CREATE POLICY cap_vmsp_delete ON public.vehicle_maintenance_service_parts FOR DELETE TO authenticated
USING (public.rbac_module_can('mezzi', 'admin'));
