-- Matrice tagliandi: annullare cella richiede stesso livello di scrittura mezzi.

DROP POLICY IF EXISTS cap_vms_delete ON public.vehicle_maintenance_services;
CREATE POLICY cap_vms_delete ON public.vehicle_maintenance_services FOR DELETE TO authenticated
USING (public.rbac_module_can('mezzi', 'write'));
