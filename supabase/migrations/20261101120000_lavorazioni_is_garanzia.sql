-- is_garanzia su lavorazioni + search tokens + list RPC

ALTER TABLE public.lavorazioni
  ADD COLUMN IF NOT EXISTS is_garanzia boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.build_lavorazione_search_document(p_lavorazione_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.normalize_search_text(
    concat_ws(' ',
      l.codice,
      l.note,
      l.stato::text,
      l.priorita::text,
      CASE WHEN l.is_tagliando THEN 'tagliando' ELSE NULL END,
      CASE WHEN l.is_garanzia THEN 'garanzia' ELSE NULL END,
      m.targa,
      m.numero_scuderia,
      m.telaio_num,
      m.marca_telaio,
      m.modello_telaio,
      m.tipo_telaio,
      m.cliente,
      m.utilizzatore,
      (
        SELECT string_agg(s.contenuto::text, ' ')
        FROM public.scheda_lavorazione s
        WHERE s.lavorazione_id = l.id
      )
    )
  )
  FROM public.lavorazioni l
  LEFT JOIN public.mezzi m ON m.id = l.mezzo_id
  WHERE l.id = p_lavorazione_id
$$;

CREATE OR REPLACE FUNCTION public.list_lavorazioni_paginated(
  p_mode text DEFAULT 'all',
  p_limit int DEFAULT 100,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_stato text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH norm AS (
    SELECT nullif(public.normalize_search_text(coalesce(p_search, '')), '') AS q
  ),
  filtered AS (
    SELECT
      l.id,
      l.mezzo_id,
      l.stato,
      l.priorita,
      l.data_ingresso,
      l.data_uscita,
      l.note,
      l.created_by,
      l.created_at,
      l.updated_at,
      l.updated_by,
      l.archived,
      l.archived_at,
      l.codice,
      l.target_type,
      l.attrezzatura_id,
      l.is_tagliando,
      l.is_garanzia,
      l.maintenance_execution_kind,
      l.repair_present,
      l.tagliando_preset_ref
    FROM public.lavorazioni l
    CROSS JOIN norm n
    WHERE l.deleted_at IS NULL
      AND (
        p_mode = 'all'
        OR (p_mode = 'active' AND l.archived = false)
        OR (p_mode = 'closed' AND l.archived = true)
      )
      AND (p_stato IS NULL OR l.stato = p_stato)
      AND (
        n.q IS NULL
        OR l.search_document LIKE '%' || n.q || '%'
        OR l.search_vector @@ websearch_to_tsquery('italian', p_search)
      )
      AND (
        p_cursor_created_at IS NULL
        OR p_cursor_id IS NULL
        OR (l.created_at, l.id) < (p_cursor_created_at, p_cursor_id)
      )
    ORDER BY l.created_at DESC NULLS LAST, l.id DESC
    LIMIT least(greatest(coalesce(p_limit, 1), 1), 200)
  ),
  page_rows AS (
    SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.created_at DESC, f.id DESC), '[]'::jsonb) AS rows
    FROM filtered f
  ),
  last_row AS (
    SELECT f.created_at, f.id
    FROM filtered f
    ORDER BY f.created_at DESC, f.id DESC
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'rows', (SELECT rows FROM page_rows),
    'next_cursor', CASE
      WHEN (SELECT count(*) FROM filtered) < least(greatest(coalesce(p_limit, 1), 1), 200) THEN NULL
      ELSE jsonb_build_object(
        'created_at', (SELECT created_at FROM last_row),
        'id', (SELECT id FROM last_row)
      )
    END
  );
$$;

UPDATE public.lavorazioni l
SET search_document = coalesce(public.build_lavorazione_search_document(l.id), '')
WHERE l.deleted_at IS NULL;
