-- Asset Lifecycle — compliance records + ricalcolo next_due (M3)

CREATE TABLE IF NOT EXISTS public.asset_compliance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.asset_compliance_rules(id) ON DELETE SET NULL,
  asset_kind public.asset_kind NOT NULL,
  mezzo_id uuid REFERENCES public.mezzi(id) ON DELETE CASCADE,
  attrezzatura_id uuid REFERENCES public.attrezzature(id) ON DELETE CASCADE,
  rule_kind public.compliance_rule_kind NOT NULL,
  completed_at date NOT NULL,
  km_at_completion numeric,
  document_ref text,
  esito text NOT NULL DEFAULT 'ok' CHECK (esito IN ('ok', 'non_conforme', 'rinviato')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT compliance_records_asset_coerente CHECK (
    (asset_kind = 'mezzo' AND mezzo_id IS NOT NULL AND attrezzatura_id IS NULL)
    OR (asset_kind = 'attrezzatura' AND attrezzatura_id IS NOT NULL AND mezzo_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_compliance_records_rule ON public.asset_compliance_records (rule_id) WHERE rule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_records_mezzo ON public.asset_compliance_records (mezzo_id) WHERE mezzo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_records_attrezzatura ON public.asset_compliance_records (attrezzatura_id) WHERE attrezzatura_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.recalc_compliance_rule_due(p_rule_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.asset_compliance_rules%ROWTYPE;
  v_last date;
  v_km numeric;
BEGIN
  SELECT * INTO r FROM public.asset_compliance_rules WHERE id = p_rule_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT MAX(completed_at) INTO v_last
  FROM public.asset_compliance_records
  WHERE rule_id = p_rule_id AND esito = 'ok';

  IF v_last IS NOT NULL THEN
    r.last_completed_at := v_last::timestamptz;
  END IF;

  CASE r.trigger_kind
    WHEN 'date_interval' THEN
      IF r.last_completed_at IS NOT NULL AND r.interval_months IS NOT NULL THEN
        r.next_due_at := (r.last_completed_at::date + (r.interval_months || ' months')::interval)::date;
      END IF;
    WHEN 'fixed_date' THEN
      r.next_due_at := make_date(
        EXTRACT(YEAR FROM CURRENT_DATE)::int,
        r.fixed_month,
        LEAST(r.fixed_day, EXTRACT(DAY FROM (date_trunc('month', make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, r.fixed_month, 1)) + interval '1 month - 1 day'))::int)
      );
      IF r.next_due_at < CURRENT_DATE THEN
        r.next_due_at := make_date(
          EXTRACT(YEAR FROM CURRENT_DATE)::int + 1,
          r.fixed_month,
          LEAST(r.fixed_day, EXTRACT(DAY FROM (date_trunc('month', make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1, r.fixed_month, 1)) + interval '1 month - 1 day'))::int)
        );
      END IF;
    WHEN 'km_interval' THEN
      IF r.mezzo_id IS NOT NULL THEN
        SELECT km INTO v_km FROM public.mezzi WHERE id = r.mezzo_id;
        IF v_km IS NOT NULL AND r.km_interval IS NOT NULL THEN
          r.next_due_km := v_km + r.km_interval;
        END IF;
      END IF;
    WHEN 'one_shot' THEN
      NULL;
    ELSE
      NULL;
  END CASE;

  UPDATE public.asset_compliance_rules
  SET last_completed_at = r.last_completed_at,
      next_due_at = r.next_due_at,
      next_due_km = r.next_due_km,
      updated_at = now()
  WHERE id = p_rule_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_compliance_record_recalc_rule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rule_id IS NOT NULL THEN
    PERFORM public.recalc_compliance_rule_due(NEW.rule_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS asset_compliance_records_recalc_rule ON public.asset_compliance_records;
CREATE TRIGGER asset_compliance_records_recalc_rule
AFTER INSERT OR UPDATE ON public.asset_compliance_records
FOR EACH ROW EXECUTE FUNCTION public.trg_compliance_record_recalc_rule();
