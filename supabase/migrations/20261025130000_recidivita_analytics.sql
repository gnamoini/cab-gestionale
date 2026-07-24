-- Indice per storico lavorazioni per mezzo (hub Mezzi + analytics recidività).
CREATE INDEX IF NOT EXISTS idx_lavorazioni_mezzo_ingresso
  ON public.lavorazioni (mezzo_id, data_ingresso DESC)
  WHERE deleted_at IS NULL;

-- Vista read-only per analytics episodi lavorazione (estrazione JSONB schede).
CREATE OR REPLACE VIEW public.analytics_lavorazione_episode_v
WITH (security_invoker = true)
AS
SELECT
  l.id AS lavorazione_id,
  l.mezzo_id,
  l.codice,
  l.data_ingresso,
  l.data_uscita,
  l.stato,
  l.archived,
  l.deleted_at,
  si.contenuto #>> '{doc,campi,descrizioneAnomalia}' AS descrizione_anomalia,
  si.contenuto #>> '{doc,campi,addettoAccettazione}' AS addetto_accettazione,
  sl.contenuto AS scheda_lavorazioni_json,
  sr.contenuto AS scheda_ricambi_json
FROM public.lavorazioni l
LEFT JOIN public.scheda_lavorazione si
  ON si.lavorazione_id = l.id AND si.tipo = 'ingresso'
LEFT JOIN public.scheda_lavorazione sl
  ON sl.lavorazione_id = l.id AND sl.tipo = 'interventi'
LEFT JOIN public.scheda_lavorazione sr
  ON sr.lavorazione_id = l.id AND sr.tipo = 'ricambi'
WHERE l.deleted_at IS NULL;

COMMENT ON VIEW public.analytics_lavorazione_episode_v IS
  'Episodi lavorazione denormalizzati per report recidività — security invoker, no dati duplicati.';

GRANT SELECT ON public.analytics_lavorazione_episode_v TO authenticated;
