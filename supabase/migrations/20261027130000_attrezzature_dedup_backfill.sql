-- Bonifica duplicati attrezzature: exact dup + cluster matricola NULL vs valorizzata.
-- Ordine: merge campi su canonical → reindirizza FK → DELETE source.

CREATE TABLE IF NOT EXISTS public.attrezzature_dedup_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_id uuid NOT NULL,
  source_id uuid,
  merged_ids uuid[] NOT NULL DEFAULT '{}',
  mezzo_id uuid NOT NULL,
  matricola text,
  cluster_type text NOT NULL CHECK (cluster_type IN ('exact_dup', 'null_vs_valued')),
  fk_updates_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.attrezzature_dedup_report IS 'Report one-shot bonifica duplicati attrezzature.';

-- ---------------------------------------------------------------------------
-- Audit 1: duplicati esatti (stessa matricola normalizzata sullo stesso mezzo)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  grp RECORD;
  canonical uuid;
  source_id uuid;
  fk_count integer;
  n integer;
BEGIN
  FOR grp IN
    SELECT
      a.mezzo_id,
      lower(btrim(a.matricola)) AS mat_norm,
      array_agg(a.id ORDER BY
        (CASE WHEN a.tipo_attrezzatura IS NOT NULL AND btrim(a.tipo_attrezzatura) <> '' THEN 0 ELSE 1 END),
        (
          (CASE WHEN a.marca IS NOT NULL AND btrim(a.marca) NOT IN ('', '—') THEN 1 ELSE 0 END) +
          (CASE WHEN a.modello IS NOT NULL AND btrim(a.modello) NOT IN ('', '—') THEN 1 ELSE 0 END) +
          (CASE WHEN a.tipo_attrezzatura IS NOT NULL AND btrim(a.tipo_attrezzatura) <> '' THEN 1 ELSE 0 END)
        ) DESC,
        a.created_at ASC
      ) AS ids
    FROM public.attrezzature a
    WHERE a.matricola IS NOT NULL AND btrim(a.matricola) <> ''
    GROUP BY a.mezzo_id, lower(btrim(a.matricola))
    HAVING count(*) > 1
  LOOP
    canonical := grp.ids[1];
    FOR i IN 2 .. array_length(grp.ids, 1) LOOP
      source_id := grp.ids[i];
      fk_count := 0;

      UPDATE public.lavorazioni SET attrezzatura_id = canonical WHERE attrezzatura_id = source_id;
      GET DIAGNOSTICS n = ROW_COUNT;
      fk_count := fk_count + n;
      UPDATE public.ddt_documents SET attrezzatura_id = canonical WHERE attrezzatura_id = source_id;
      GET DIAGNOSTICS n = ROW_COUNT;
      fk_count := fk_count + n;

      UPDATE public.attrezzature c
      SET
        tipo_attrezzatura = COALESCE(NULLIF(btrim(c.tipo_attrezzatura), ''), NULLIF(btrim(s.tipo_attrezzatura), '')),
        marca = COALESCE(NULLIF(btrim(c.marca), ''), NULLIF(btrim(s.marca), ''), c.marca),
        modello = COALESCE(NULLIF(btrim(c.modello), ''), NULLIF(btrim(s.modello), ''), c.modello),
        portata = COALESCE(c.portata, s.portata),
        anno = COALESCE(c.anno, s.anno),
        note = COALESCE(NULLIF(btrim(c.note), ''), NULLIF(btrim(s.note), ''))
      FROM public.attrezzature s
      WHERE c.id = canonical AND s.id = source_id;

      DELETE FROM public.attrezzature WHERE id = source_id;

      INSERT INTO public.attrezzature_dedup_report (
        canonical_id, source_id, merged_ids, mezzo_id, matricola, cluster_type, fk_updates_count
      ) VALUES (
        canonical, source_id, ARRAY[source_id], grp.mezzo_id, grp.mat_norm, 'exact_dup', fk_count
      );
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Audit 2: cluster NULL matricola + matricola valorizzata (stesso mezzo)
-- canonical = più vecchio; source = record con matricola valorizzata
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pair RECORD;
  fk_count integer;
  n integer;
BEGIN
  FOR pair IN
    SELECT DISTINCT ON (a_null.id, a_val.id)
      a_null.id AS canonical_id,
      a_val.id AS source_id,
      a_null.mezzo_id,
      a_val.matricola
    FROM public.attrezzature a_null
    JOIN public.attrezzature a_val ON a_null.mezzo_id = a_val.mezzo_id
    WHERE a_null.matricola IS NULL
      AND a_val.matricola IS NOT NULL AND btrim(a_val.matricola) <> ''
      AND a_null.created_at <= a_val.created_at
    ORDER BY a_null.id, a_val.id, a_val.created_at DESC
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.attrezzature x
      WHERE x.mezzo_id = pair.mezzo_id
        AND x.id NOT IN (pair.canonical_id, pair.source_id)
        AND x.matricola IS NOT NULL
        AND lower(btrim(x.matricola)) = lower(btrim(pair.matricola))
    ) THEN
      CONTINUE;
    END IF;

    fk_count := 0;
    UPDATE public.lavorazioni SET attrezzatura_id = pair.canonical_id WHERE attrezzatura_id = pair.source_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    fk_count := fk_count + n;
    UPDATE public.ddt_documents SET attrezzatura_id = pair.canonical_id WHERE attrezzatura_id = pair.source_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    fk_count := fk_count + n;

    UPDATE public.attrezzature c
    SET
      matricola = s.matricola,
      tipo_attrezzatura = COALESCE(NULLIF(btrim(c.tipo_attrezzatura), ''), NULLIF(btrim(s.tipo_attrezzatura), '')),
      marca = COALESCE(NULLIF(btrim(c.marca), ''), NULLIF(btrim(s.marca), ''), c.marca),
      modello = COALESCE(NULLIF(btrim(c.modello), ''), NULLIF(btrim(s.modello), ''), c.modello),
      portata = COALESCE(c.portata, s.portata),
      anno = COALESCE(c.anno, s.anno),
      note = COALESCE(NULLIF(btrim(c.note), ''), NULLIF(btrim(s.note), ''))
    FROM public.attrezzature s
    WHERE c.id = pair.canonical_id AND s.id = pair.source_id;

    DELETE FROM public.attrezzature WHERE id = pair.source_id;

    INSERT INTO public.attrezzature_dedup_report (
      canonical_id, source_id, merged_ids, mezzo_id, matricola, cluster_type, fk_updates_count
    ) VALUES (
      pair.canonical_id, pair.source_id, ARRAY[pair.source_id], pair.mezzo_id, pair.matricola, 'null_vs_valued', fk_count
    );
  END LOOP;
END $$;
