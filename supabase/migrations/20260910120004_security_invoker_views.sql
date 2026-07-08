-- Supabase linter 0010: views must use security_invoker so RLS on base tables applies.
-- Pattern: lavorazioni_clienti (20260518180000_rls_security_hardening.sql)

CREATE OR REPLACE VIEW public.preventivi_billing_status
WITH (security_invoker = true) AS
SELECT
  p.id AS preventivo_id,
  p.totale AS preventivo_totale,
  coalesce(sum(il.allocated_totale) FILTER (WHERE i.status <> 'annullata'), 0)::numeric(14, 2) AS fatturato,
  greatest(p.totale - coalesce(sum(il.allocated_totale) FILTER (WHERE i.status <> 'annullata'), 0), 0)::numeric(14, 2) AS residuo,
  CASE
    WHEN coalesce(sum(il.allocated_totale) FILTER (WHERE i.status <> 'annullata'), 0) <= 0 THEN 'non_fatturato'
    WHEN coalesce(sum(il.allocated_totale) FILTER (WHERE i.status <> 'annullata'), 0) < p.totale THEN 'parzialmente_fatturato'
    ELSE 'totalmente_fatturato'
  END AS stato_fatturazione
FROM public.preventivi p
LEFT JOIN public.invoice_links il ON il.source_type = 'preventivo' AND il.source_id = p.id
LEFT JOIN public.invoices i ON i.id = il.invoice_id
GROUP BY p.id, p.totale;

GRANT SELECT ON public.preventivi_billing_status TO authenticated;

CREATE OR REPLACE VIEW public.preventivo_ddt_fulfillment
WITH (security_invoker = true) AS
SELECT
  r.preventivo_id,
  r.source_ref,
  max((r.meta->>'qty_ordered')::numeric) AS qty_preventivo,
  coalesce(sum(r.quantita) FILTER (WHERE d.status <> 'annullato'), 0)::numeric AS qty_consegnata,
  greatest(
    coalesce(max((r.meta->>'qty_ordered')::numeric), 0)
    - coalesce(sum(r.quantita) FILTER (WHERE d.status <> 'annullato'), 0),
    0
  )::numeric AS qty_residua
FROM public.ddt_rows r
JOIN public.ddt_documents d ON d.id = r.ddt_id
WHERE r.preventivo_id IS NOT NULL
GROUP BY r.preventivo_id, r.source_ref;

GRANT SELECT ON public.preventivo_ddt_fulfillment TO authenticated;

CREATE OR REPLACE VIEW public.asset_timeline_projection
WITH (security_invoker = true) AS
  SELECT
    'compliance_due'::text AS event_category,
    'lifecycle'::text AS event_domain,
    r.id AS source_id,
    r.asset_kind,
    r.mezzo_id,
    r.attrezzatura_id,
    r.next_due_at::timestamptz AS event_at,
    r.rule_kind::text AS event_subtype,
    CASE
      WHEN r.next_due_at < CURRENT_DATE THEN 'urgent'
      WHEN r.next_due_at <= CURRENT_DATE + r.alert_days_before THEN 'high'
      ELSE 'medium'
    END AS priority,
    r.rule_kind::text || ' in scadenza' AS label
  FROM public.asset_compliance_rules r
  WHERE r.is_active AND r.next_due_at IS NOT NULL

  UNION ALL

  SELECT
    'compliance_done'::text,
    'lifecycle'::text,
    rec.id,
    rec.asset_kind,
    rec.mezzo_id,
    rec.attrezzatura_id,
    rec.completed_at::timestamptz,
    rec.rule_kind::text,
    'low'::text,
    rec.rule_kind::text || ' completata'
  FROM public.asset_compliance_records rec

  UNION ALL

  SELECT
    CASE WHEN h.valid_to IS NULL THEN 'assignment_start' ELSE 'assignment_end' END,
    'lifecycle'::text,
    h.id,
    'attrezzatura'::public.asset_kind,
    h.mezzo_id,
    h.attrezzatura_id,
    COALESCE(h.valid_to, h.valid_from),
    h.change_reason::text,
    'medium'::text,
    'Assegnazione attrezzatura'
  FROM public.asset_assignment_history h

  UNION ALL

  SELECT
    'mileage_reading'::text,
    'lifecycle'::text,
    m.id,
    'mezzo'::public.asset_kind,
    m.mezzo_id,
    NULL::uuid,
    m.recorded_at,
    m.source::text,
    'low'::text,
    'Km ' || m.km::text
  FROM public.asset_mileage_readings m;

COMMENT ON VIEW public.asset_timeline_projection IS 'Read-only lifecycle projection — non scrivere direttamente.';

GRANT SELECT ON public.asset_timeline_projection TO authenticated;

CREATE OR REPLACE VIEW public.v_dashboard_lavorazioni_kpi
WITH (security_invoker = true) AS
SELECT
  COUNT(*) FILTER (WHERE archived = false AND deleted_at IS NULL)::bigint AS attive_count,
  COUNT(*) FILTER (WHERE archived = false AND deleted_at IS NULL AND priorita IN ('urgente', 'alta'))::bigint AS urgenti_count,
  COUNT(*) FILTER (
    WHERE archived = false
      AND deleted_at IS NULL
      AND COALESCE(data_ingresso, created_at)::date = CURRENT_DATE
  )::bigint AS entrati_oggi_count
FROM public.lavorazioni;

GRANT SELECT ON public.v_dashboard_lavorazioni_kpi TO authenticated;
