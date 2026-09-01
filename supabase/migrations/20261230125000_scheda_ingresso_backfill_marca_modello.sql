-- Backfill controllato: marca/modello da catalogo attrezzature
-- Solo: scheda PRESENTE + campo vuoto/null + catalogo valorizzato
-- NON tocca matricola (semantica intervento — audit only)

-- Pre-count marca (campo_vuoto eleggibili)
-- SELECT count(*) FROM ... WHERE classe = 'campo_vuoto' AND catalogo valorizzato

UPDATE scheda_lavorazione sl
SET contenuto = jsonb_set(
  contenuto,
  '{doc,campi,marcaAttrezzatura}',
  to_jsonb(trim(a.marca)),
  true
)
FROM lavorazioni l
JOIN attrezzature a ON a.id = l.attrezzatura_id
WHERE sl.lavorazione_id = l.id
  AND sl.tipo = 'ingresso'
  AND l.deleted_at IS NULL
  AND (
    sl.contenuto #>> '{doc,campi,marcaAttrezzatura}' IS NULL
    OR trim(coalesce(sl.contenuto #>> '{doc,campi,marcaAttrezzatura}', '')) = ''
  )
  AND trim(coalesce(a.marca, '')) NOT IN ('', '—');

UPDATE scheda_lavorazione sl
SET contenuto = jsonb_set(
  contenuto,
  '{doc,campi,modelloAttrezzatura}',
  to_jsonb(trim(a.modello)),
  true
)
FROM lavorazioni l
JOIN attrezzature a ON a.id = l.attrezzatura_id
WHERE sl.lavorazione_id = l.id
  AND sl.tipo = 'ingresso'
  AND l.deleted_at IS NULL
  AND (
    sl.contenuto #>> '{doc,campi,modelloAttrezzatura}' IS NULL
    OR trim(coalesce(sl.contenuto #>> '{doc,campi,modelloAttrezzatura}', '')) = ''
  )
  AND trim(coalesce(a.modello, '')) NOT IN ('', '—');
