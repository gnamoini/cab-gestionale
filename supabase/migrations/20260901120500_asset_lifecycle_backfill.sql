-- Asset Lifecycle — backfill assignment history + km readings (M6)

INSERT INTO public.asset_assignment_history (
  attrezzatura_id, mezzo_id, valid_from, valid_to, change_reason, created_by
)
SELECT
  a.id,
  a.mezzo_id,
  a.created_at,
  NULL,
  'installazione'::public.assignment_change_reason,
  a.created_by
FROM public.attrezzature a
WHERE NOT EXISTS (
  SELECT 1 FROM public.asset_assignment_history h
  WHERE h.attrezzatura_id = a.id
);

INSERT INTO public.asset_mileage_readings (
  mezzo_id, recorded_at, km, source, created_by, note
)
SELECT
  m.id,
  COALESCE(m.updated_at, m.created_at),
  m.km,
  'import'::public.mileage_source,
  m.created_by,
  'Backfill da mezzi.km'
FROM public.mezzi m
WHERE m.km IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.asset_mileage_readings r
    WHERE r.mezzo_id = m.id AND r.source = 'import'
  );
