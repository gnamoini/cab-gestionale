-- Asset Lifecycle — compliance rules (M2)

CREATE TABLE IF NOT EXISTS public.asset_compliance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_kind public.asset_kind NOT NULL,
  mezzo_id uuid REFERENCES public.mezzi(id) ON DELETE CASCADE,
  attrezzatura_id uuid REFERENCES public.attrezzature(id) ON DELETE CASCADE,
  rule_kind public.compliance_rule_kind NOT NULL,
  trigger_kind public.compliance_trigger_kind NOT NULL,
  interval_months integer,
  fixed_month smallint CHECK (fixed_month IS NULL OR (fixed_month BETWEEN 1 AND 12)),
  fixed_day smallint CHECK (fixed_day IS NULL OR (fixed_day BETWEEN 1 AND 31)),
  km_interval integer CHECK (km_interval IS NULL OR km_interval > 0),
  last_completed_at timestamptz,
  next_due_at date,
  next_due_km numeric,
  alert_days_before integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT compliance_rules_asset_coerente CHECK (
    (asset_kind = 'mezzo' AND mezzo_id IS NOT NULL AND attrezzatura_id IS NULL)
    OR (asset_kind = 'attrezzatura' AND attrezzatura_id IS NOT NULL AND mezzo_id IS NULL)
  ),
  CONSTRAINT compliance_rules_trigger_coerente CHECK (
    (trigger_kind = 'date_interval' AND interval_months IS NOT NULL)
    OR (trigger_kind = 'fixed_date' AND fixed_month IS NOT NULL AND fixed_day IS NOT NULL)
    OR (trigger_kind = 'km_interval' AND km_interval IS NOT NULL AND asset_kind = 'mezzo')
    OR (trigger_kind = 'one_shot' AND next_due_at IS NOT NULL)
  )
);

DROP TRIGGER IF EXISTS asset_compliance_rules_set_updated_at ON public.asset_compliance_rules;
CREATE TRIGGER asset_compliance_rules_set_updated_at
BEFORE UPDATE ON public.asset_compliance_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_compliance_rules_mezzo ON public.asset_compliance_rules (mezzo_id) WHERE mezzo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_rules_attrezzatura ON public.asset_compliance_rules (attrezzatura_id) WHERE attrezzatura_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_rules_next_due ON public.asset_compliance_rules (next_due_at) WHERE is_active AND next_due_at IS NOT NULL;
