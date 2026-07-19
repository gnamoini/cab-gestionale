-- Versioni per-tabella per dirty-sync / polling (evita banner su dominio sbagliato o senza drift reale).
CREATE OR REPLACE FUNCTION public.get_operational_table_versions()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_strip_nulls(
    jsonb_build_object(
      'lavorazioni',
        (SELECT EXTRACT(EPOCH FROM MAX(updated_at))::bigint FROM lavorazioni WHERE deleted_at IS NULL),
      'scheda_lavorazione',
        (SELECT EXTRACT(EPOCH FROM MAX(updated_at))::bigint FROM scheda_lavorazione),
      'magazzino_ricambi',
        (SELECT EXTRACT(EPOCH FROM MAX(updated_at))::bigint FROM magazzino_ricambi),
      'movimenti_ricambi',
        (SELECT EXTRACT(EPOCH FROM MAX(created_at))::bigint FROM movimenti_ricambi),
      'mezzi',
        (SELECT EXTRACT(EPOCH FROM MAX(updated_at))::bigint FROM mezzi),
      'documenti',
        (SELECT EXTRACT(EPOCH FROM MAX(updated_at))::bigint FROM documenti),
      'preventivi',
        (SELECT EXTRACT(EPOCH FROM MAX(updated_at))::bigint FROM preventivi),
      'ordini_fornitori',
        (SELECT EXTRACT(EPOCH FROM MAX(updated_at))::bigint FROM ordini_fornitori),
      'invoices',
        (SELECT EXTRACT(EPOCH FROM MAX(updated_at))::bigint FROM invoices),
      'invoice_payments',
        (SELECT EXTRACT(EPOCH FROM MAX(created_at))::bigint FROM invoice_payments),
      'ddt_documents',
        (SELECT EXTRACT(EPOCH FROM MAX(updated_at))::bigint FROM ddt_documents)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_operational_data_version()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT MAX((value #>> '{}')::bigint)
      FROM jsonb_each(public.get_operational_table_versions())
    ),
    0
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_operational_table_versions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_operational_data_version() TO authenticated;
