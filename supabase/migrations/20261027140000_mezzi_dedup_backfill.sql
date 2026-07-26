-- Bonifica duplicati mezzi: targa/VIN/cluster incompleti + redirect FK storico completo.

CREATE TABLE IF NOT EXISTS public.mezzi_dedup_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_id uuid NOT NULL,
  source_id uuid,
  merged_ids uuid[] NOT NULL DEFAULT '{}',
  match_type text NOT NULL CHECK (match_type IN ('targa_dup', 'vin_dup', 'partial_cluster')),
  vin text,
  targa text,
  fk_updates_count integer NOT NULL DEFAULT 0,
  conflict_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mezzi_dedup_report IS 'Report one-shot bonifica duplicati mezzi.';

CREATE OR REPLACE FUNCTION public.mezzi_normalize_targa(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(replace(replace(replace(trim(raw), ' ', ''), '-', ''), '/', ''));
$$;

CREATE OR REPLACE FUNCTION public.mezzi_redirect_fk(p_canonical uuid, p_source uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  fk_count integer := 0;
  n integer;
BEGIN
  UPDATE public.lavorazioni SET mezzo_id = p_canonical WHERE mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  UPDATE public.attrezzature SET mezzo_id = p_canonical WHERE mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  UPDATE public.preventivi SET mezzo_id = p_canonical WHERE mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  UPDATE public.documenti SET mezzo_id = p_canonical WHERE mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  UPDATE public.ddt_documents SET mezzo_id = p_canonical WHERE mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  UPDATE public.document_capture SET mezzo_id = p_canonical WHERE mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  UPDATE public.tkb_draft_operative_history SET mezzo_id = p_canonical WHERE mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  UPDATE public.mezzo_anagrafica_history SET mezzo_id = p_canonical WHERE mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  UPDATE public.asset_assignment_history SET mezzo_id = p_canonical WHERE mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  UPDATE public.asset_mileage_readings SET mezzo_id = p_canonical WHERE mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  UPDATE public.asset_compliance_rules SET mezzo_id = p_canonical WHERE mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  UPDATE public.asset_compliance_records SET mezzo_id = p_canonical WHERE mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  UPDATE public.vehicle_maintenance_configs SET mezzo_id = p_canonical WHERE mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  UPDATE public.vehicle_maintenance_services SET mezzo_id = p_canonical WHERE mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  UPDATE public.maintenance_preset_overrides SET mezzo_id = p_canonical WHERE mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  UPDATE public.mezzo_resolution_events SET resolved_mezzo_id = p_canonical WHERE resolved_mezzo_id = p_source;
  GET DIAGNOSTICS n = ROW_COUNT; fk_count := fk_count + n;

  RETURN fk_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.mezzi_merge_anagrafica(p_canonical uuid, p_source uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.mezzi c
  SET
    targa = COALESCE(NULLIF(trim(c.targa), ''), NULLIF(trim(s.targa), '')),
    telaio_num = COALESCE(NULLIF(trim(c.telaio_num), ''), NULLIF(trim(s.telaio_num), '')),
    marca_telaio = COALESCE(NULLIF(trim(c.marca_telaio), ''), NULLIF(trim(s.marca_telaio), '')),
    modello_telaio = COALESCE(NULLIF(trim(c.modello_telaio), ''), NULLIF(trim(s.modello_telaio), '')),
    tipo_telaio = COALESCE(NULLIF(trim(c.tipo_telaio), ''), NULLIF(trim(s.tipo_telaio), '')),
    utilizzatore = COALESCE(NULLIF(trim(c.utilizzatore), ''), NULLIF(trim(s.utilizzatore), '')),
    numero_scuderia = COALESCE(NULLIF(trim(c.numero_scuderia), ''), NULLIF(trim(s.numero_scuderia), '')),
    km = GREATEST(COALESCE(c.km, 0), COALESCE(s.km, 0)),
    ultimo_km_rilevato = GREATEST(COALESCE(c.ultimo_km_rilevato, 0), COALESCE(s.ultimo_km_rilevato, 0)),
    ultimo_ore_rilevate = GREATEST(COALESCE(c.ultimo_ore_rilevate, 0), COALESCE(s.ultimo_ore_rilevate, 0))
  FROM public.mezzi s
  WHERE c.id = p_canonical AND s.id = p_source;
END;
$$;

DO $$
DECLARE
  grp RECORD;
  canonical uuid;
  source_id uuid;
  fk_count integer;
  i integer;
BEGIN
  FOR grp IN
    SELECT
      public.mezzi_normalize_targa(m.targa) AS targa_norm,
      array_agg(m.id ORDER BY
        (CASE WHEN m.telaio_num IS NOT NULL AND trim(m.telaio_num) <> '' THEN 0 ELSE 1 END),
        (CASE WHEN m.targa IS NOT NULL AND trim(m.targa) <> '' THEN 0 ELSE 1 END),
        (
          (CASE WHEN m.marca_telaio IS NOT NULL AND trim(m.marca_telaio) <> '' THEN 1 ELSE 0 END) +
          (CASE WHEN m.modello_telaio IS NOT NULL AND trim(m.modello_telaio) <> '' THEN 1 ELSE 0 END) +
          (CASE WHEN m.tipo_telaio IS NOT NULL AND trim(m.tipo_telaio) <> '' THEN 1 ELSE 0 END)
        ) DESC,
        m.created_at ASC
      ) AS ids
    FROM public.mezzi m
    WHERE m.targa IS NOT NULL AND trim(m.targa) <> ''
    GROUP BY public.mezzi_normalize_targa(m.targa)
    HAVING count(*) > 1
  LOOP
    canonical := grp.ids[1];
    FOR i IN 2 .. array_length(grp.ids, 1) LOOP
      source_id := grp.ids[i];
      PERFORM public.mezzi_merge_anagrafica(canonical, source_id);
      fk_count := public.mezzi_redirect_fk(canonical, source_id);
      DELETE FROM public.mezzi WHERE id = source_id;
      INSERT INTO public.mezzi_dedup_report (
        canonical_id, source_id, merged_ids, match_type, targa, fk_updates_count
      ) VALUES (
        canonical, source_id, ARRAY[source_id], 'targa_dup', grp.targa_norm, fk_count
      );
    END LOOP;
  END LOOP;
END $$;

DO $$
DECLARE
  grp RECORD;
  canonical uuid;
  source_id uuid;
  fk_count integer;
  i integer;
BEGIN
  FOR grp IN
    SELECT
      m.telaio_num_norm AS vin_norm,
      array_agg(m.id ORDER BY m.created_at ASC) AS ids
    FROM public.mezzi m
    WHERE m.telaio_num_norm IS NOT NULL AND trim(m.telaio_num_norm) <> ''
    GROUP BY m.telaio_num_norm
    HAVING count(*) > 1
  LOOP
    canonical := grp.ids[1];
    FOR i IN 2 .. array_length(grp.ids, 1) LOOP
      source_id := grp.ids[i];
      PERFORM public.mezzi_merge_anagrafica(canonical, source_id);
      fk_count := public.mezzi_redirect_fk(canonical, source_id);
      DELETE FROM public.mezzi WHERE id = source_id;
      INSERT INTO public.mezzi_dedup_report (
        canonical_id, source_id, merged_ids, match_type, vin, fk_updates_count
      ) VALUES (
        canonical, source_id, ARRAY[source_id], 'vin_dup', grp.vin_norm, fk_count
      );
    END LOOP;
  END LOOP;
END $$;
