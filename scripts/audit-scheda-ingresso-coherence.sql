-- Audit coerenza Scheda di Ingresso vs catalogo attrezzature
-- Classificazione record per campo (marca/modello/tipo/matricola)

-- marcaAttrezzatura
SELECT
  'marcaAttrezzatura' AS campo,
  CASE
    WHEN sl.id IS NULL THEN 'scheda_assente'
    WHEN sl.contenuto #>> '{doc,campi,marcaAttrezzatura}' IS NULL THEN 'campo_null'
    WHEN trim(coalesce(sl.contenuto #>> '{doc,campi,marcaAttrezzatura}', '')) = '' THEN 'campo_vuoto'
    WHEN trim(coalesce(a.marca, '')) NOT IN ('', '—')
      AND trim(a.marca) IS DISTINCT FROM trim(sl.contenuto #>> '{doc,campi,marcaAttrezzatura}')
      THEN 'divergenza_scheda_catalogo'
    WHEN trim(coalesce(sl.contenuto #>> '{doc,campi,marcaAttrezzatura}', '')) <> '' THEN 'campo_valorizzato'
    ELSE 'catalogo_assente_o_vuoto'
  END AS classe,
  count(*) AS n
FROM lavorazioni l
LEFT JOIN scheda_lavorazione sl ON sl.lavorazione_id = l.id AND sl.tipo = 'ingresso'
LEFT JOIN attrezzature a ON a.id = l.attrezzatura_id
WHERE l.deleted_at IS NULL
GROUP BY 1, 2
ORDER BY 1, 2;

-- modelloAttrezzatura
SELECT
  'modelloAttrezzatura' AS campo,
  CASE
    WHEN sl.id IS NULL THEN 'scheda_assente'
    WHEN sl.contenuto #>> '{doc,campi,modelloAttrezzatura}' IS NULL THEN 'campo_null'
    WHEN trim(coalesce(sl.contenuto #>> '{doc,campi,modelloAttrezzatura}', '')) = '' THEN 'campo_vuoto'
    WHEN trim(coalesce(a.modello, '')) NOT IN ('', '—')
      AND trim(a.modello) IS DISTINCT FROM trim(sl.contenuto #>> '{doc,campi,modelloAttrezzatura}')
      THEN 'divergenza_scheda_catalogo'
    WHEN trim(coalesce(sl.contenuto #>> '{doc,campi,modelloAttrezzatura}', '')) <> '' THEN 'campo_valorizzato'
    ELSE 'catalogo_assente_o_vuoto'
  END AS classe,
  count(*) AS n
FROM lavorazioni l
LEFT JOIN scheda_lavorazione sl ON sl.lavorazione_id = l.id AND sl.tipo = 'ingresso'
LEFT JOIN attrezzature a ON a.id = l.attrezzatura_id
WHERE l.deleted_at IS NULL
GROUP BY 1, 2
ORDER BY 1, 2;

-- matricola (audit only — no backfill automatico)
SELECT
  'matricola' AS campo,
  CASE
    WHEN sl.id IS NULL THEN 'scheda_assente'
    WHEN sl.contenuto #>> '{doc,campi,matricola}' IS NULL THEN 'campo_null'
    WHEN trim(coalesce(sl.contenuto #>> '{doc,campi,matricola}', '')) IN ('', '—', 'non assegnata', 'Non assegnata')
      THEN 'campo_vuoto'
    WHEN trim(coalesce(a.matricola, '')) NOT IN ('', '—', 'non assegnata', 'Non assegnata')
      AND trim(a.matricola) IS DISTINCT FROM trim(sl.contenuto #>> '{doc,campi,matricola}')
      THEN 'divergenza_scheda_catalogo'
    WHEN trim(coalesce(sl.contenuto #>> '{doc,campi,matricola}', '')) NOT IN ('', '—', 'non assegnata', 'Non assegnata')
      THEN 'campo_valorizzato'
    ELSE 'catalogo_assente_o_vuoto'
  END AS classe,
  count(*) AS n
FROM lavorazioni l
LEFT JOIN scheda_lavorazione sl ON sl.lavorazione_id = l.id AND sl.tipo = 'ingresso'
LEFT JOIN attrezzature a ON a.id = l.attrezzatura_id
WHERE l.deleted_at IS NULL
GROUP BY 1, 2
ORDER BY 1, 2;
