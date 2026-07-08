-- Supabase Security Advisor: search_path hardening + revoke anon on SECURITY DEFINER RPC.

-- Orphan org helpers (not in repo migrations).
DROP FUNCTION IF EXISTS public.can_write_org(uuid);
DROP FUNCTION IF EXISTS public.is_member_org(uuid);

-- Lint 0011: function_search_path_mutable
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.rbac_normalize_role(text) SET search_path = public;
ALTER FUNCTION public.rbac_is_restricted_app_settings_row(text, text) SET search_path = public;
ALTER FUNCTION public.rbac_resource_to_module(text) SET search_path = public;
ALTER FUNCTION public.rbac_log_entita_module(text) SET search_path = public;
ALTER FUNCTION public.invoice_recalculate_status(numeric, numeric, date, text) SET search_path = public;
ALTER FUNCTION public.rbac_is_valid_erp_module(text) SET search_path = public;
ALTER FUNCTION public.rbac_role_module_default(text, text, text) SET search_path = public;
ALTER FUNCTION public.trg_profiles_ruolo_guard() SET search_path = public;
ALTER FUNCTION public.trg_profiles_role_key_guard() SET search_path = public;
ALTER FUNCTION public.ordine_fornitore_row_total(numeric, numeric, numeric) SET search_path = public;
ALTER FUNCTION public.ordine_fornitore_compute_totals(jsonb, numeric, numeric) SET search_path = public;
ALTER FUNCTION public.mezzi_legacy_attrezzatura_valued(text, text, text, text) SET search_path = public;
ALTER FUNCTION public.notification_priority_rank(text) SET search_path = public;
ALTER FUNCTION public.profile_display_name(text, text) SET search_path = public;
ALTER FUNCTION public.document_capture_guard_post_finalize() SET search_path = public;
ALTER FUNCTION public.document_capture_events_append_only() SET search_path = public;
ALTER FUNCTION public.document_capture_assert_status_transition(text, text) SET search_path = public;

-- Lint 0028: anon must not execute SECURITY DEFINER functions via PostgREST.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM anon',
      r.proname,
      r.args
    );
    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC',
      r.proname,
      r.args
    );
  END LOOP;
END $$;
