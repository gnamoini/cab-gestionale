-- PR-6 optional: lightweight operational version for polling fallback (no jitter on consumer).
CREATE OR REPLACE FUNCTION public.get_operational_data_version()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT MAX(v)::bigint
      FROM (
        SELECT EXTRACT(EPOCH FROM MAX(updated_at))::bigint AS v FROM lavorazioni WHERE deleted_at IS NULL
        UNION ALL
        SELECT EXTRACT(EPOCH FROM MAX(updated_at))::bigint FROM magazzino_ricambi
        UNION ALL
        SELECT EXTRACT(EPOCH FROM MAX(updated_at))::bigint FROM mezzi
      ) s
    ),
    0
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_operational_data_version() TO authenticated;
