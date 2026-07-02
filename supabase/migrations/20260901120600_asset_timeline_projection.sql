-- Asset Lifecycle — read projection view (M7)

CREATE OR REPLACE VIEW public.asset_timeline_projection AS
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
