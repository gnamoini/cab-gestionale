-- Supabase Security Advisor lint 0029: revoke authenticated on internal/trigger SECURITY DEFINER functions.
-- Intentional public RPC endpoints (ddt, fatture, notifiche, rbac RLS helpers, …) are unchanged.

-- Trigger / auth signup
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE ALL ON FUNCTION public.log_app_settings_update_audit() FROM authenticated;
REVOKE ALL ON FUNCTION public.prune_log_modifiche_retention() FROM authenticated;
REVOKE ALL ON FUNCTION public.trg_lavorazioni_assign_codice() FROM authenticated;
REVOKE ALL ON FUNCTION public.trg_ordini_fornitori_assign_numero() FROM authenticated;
REVOKE ALL ON FUNCTION public.trg_preventivi_assign_numero() FROM authenticated;
REVOKE ALL ON FUNCTION public.trg_fanout_client_portal_lavorazione_ingresso() FROM authenticated;
REVOKE ALL ON FUNCTION public.trg_fanout_client_portal_lavorazione_completata() FROM authenticated;
REVOKE ALL ON FUNCTION public.sync_mezzo_km_from_reading() FROM authenticated;
REVOKE ALL ON FUNCTION public.trg_compliance_record_recalc_rule() FROM authenticated;

-- Internal helpers (called only from other SECURITY DEFINER functions / triggers)
REVOKE ALL ON FUNCTION public.assert_ddt_preventivo_row_allocations(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.assert_invoice_preventivo_allocations(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.assign_ddt_numero(integer, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.assign_lavorazione_codice(timestamp with time zone) FROM authenticated;
REVOKE ALL ON FUNCTION public.assign_ordine_fornitore_numero(date) FROM authenticated;
REVOKE ALL ON FUNCTION public.assign_preventivo_numero_lavorazione(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.assign_preventivo_numero_manuale(timestamp with time zone) FROM authenticated;
REVOKE ALL ON FUNCTION public.ddt_preventivo_row_delivered_qty(uuid, text, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.invoice_preventivo_allocated_total(uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.recalc_compliance_rule_due(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.wse_write_history(uuid, integer, text, jsonb, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.document_capture_assert_status_transition(text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.cab_fanout_client_portal_lavorazione_notification(text, uuid) FROM authenticated;

-- service_role only
REVOKE ALL ON FUNCTION public.security_set_user_role(uuid, text) FROM authenticated;

-- ponytail: catch-all for any SECURITY DEFINER trigger functions still executable by authenticated
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_type t ON t.oid = p.prorettype
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND t.typname = 'trigger'
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM authenticated',
      r.proname,
      r.args
    );
  END LOOP;
END $$;
