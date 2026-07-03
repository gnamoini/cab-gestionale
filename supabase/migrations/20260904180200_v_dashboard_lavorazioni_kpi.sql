-- PR-5 — dashboard/report KPI aggregates (module gate, no per-row scan in UI).
CREATE OR REPLACE VIEW public.v_dashboard_lavorazioni_kpi AS
SELECT
  COUNT(*) FILTER (WHERE archived = false AND deleted_at IS NULL)::bigint AS attive_count,
  COUNT(*) FILTER (WHERE archived = false AND deleted_at IS NULL AND priorita IN ('urgente', 'alta'))::bigint AS urgenti_count,
  COUNT(*) FILTER (
    WHERE archived = false
      AND deleted_at IS NULL
      AND COALESCE(data_ingresso, created_at)::date = CURRENT_DATE
  )::bigint AS entrati_oggi_count
FROM lavorazioni;

GRANT SELECT ON public.v_dashboard_lavorazioni_kpi TO authenticated;
