-- Asset Lifecycle Layer — enum types (M1)

DO $$ BEGIN
  CREATE TYPE public.asset_kind AS ENUM ('mezzo', 'attrezzatura');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.compliance_rule_kind AS ENUM (
    'revisione', 'tagliando', 'assicurazione', 'bollo', 'verifica_attrezzatura', 'collaudo', 'altro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.compliance_trigger_kind AS ENUM (
    'date_interval', 'fixed_date', 'km_interval', 'one_shot'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.mileage_source AS ENUM ('scheda', 'manual', 'import', 'correction');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.assignment_change_reason AS ENUM (
    'installazione', 'smontaggio', 'spostamento', 'correzione', 'altro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
