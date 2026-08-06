-- Audit: mismatch tra scheda ingresso snapshot e mezzo collegato (read-only)
-- Eseguire su Supabase SQL editor o psql. Nessuna modifica automatica.

-- Query 1: cliente scheda != cliente mezzo
SELECT
  l.id AS lavorazione_id,
  l.mezzo_id,
  sl.contenuto->'doc'->'campi'->>'cliente' AS scheda_cliente,
  m.cliente AS mezzo_cliente,
  sl.contenuto->'doc'->'mezzoLink'->>'origin' AS mezzo_link_origin,
  sl.contenuto->'doc'->'mezzoLink'->>'confirmed' AS mezzo_link_confirmed,
  l.created_at
FROM lavorazioni l
JOIN scheda_lavorazione sl ON sl.lavorazione_id = l.id AND sl.tipo = 'ingresso'
JOIN mezzi m ON m.id = l.mezzo_id
WHERE trim(coalesce(sl.contenuto->'doc'->'campi'->>'cliente', '')) <> ''
  AND trim(coalesce(m.cliente, '')) <> ''
  AND lower(trim(sl.contenuto->'doc'->'campi'->>'cliente')) <> lower(trim(m.cliente))
ORDER BY l.created_at DESC
LIMIT 500;

-- Query 2: mismatch snapshot ident (scheda campi vs mezzo attuale)
SELECT
  l.id AS lavorazione_id,
  l.mezzo_id,
  sl.contenuto->'doc'->'campi'->>'nScuderia' AS scheda_scuderia,
  m.numero_scuderia AS mezzo_scuderia,
  sl.contenuto->'doc'->'campi'->>'matricola' AS scheda_matricola,
  m.matricola AS mezzo_matricola_note,
  sl.contenuto->'doc'->'campi'->>'targa' AS scheda_targa,
  m.targa AS mezzo_targa,
  sl.contenuto->'doc'->'campi'->>'vin' AS scheda_vin,
  m.telaio_num AS mezzo_vin,
  l.created_at
FROM lavorazioni l
JOIN scheda_lavorazione sl ON sl.lavorazione_id = l.id AND sl.tipo = 'ingresso'
JOIN mezzi m ON m.id = l.mezzo_id
WHERE
  (
    trim(coalesce(sl.contenuto->'doc'->'campi'->>'nScuderia', '')) <> ''
    AND trim(coalesce(m.numero_scuderia, '')) <> ''
    AND lower(trim(sl.contenuto->'doc'->'campi'->>'nScuderia')) <> lower(trim(m.numero_scuderia))
  )
  OR (
    trim(coalesce(sl.contenuto->'doc'->'campi'->>'targa', '')) <> ''
    AND trim(coalesce(m.targa, '')) <> ''
    AND lower(trim(sl.contenuto->'doc'->'campi'->>'targa')) <> lower(trim(m.targa))
  )
  OR (
    trim(coalesce(sl.contenuto->'doc'->'campi'->>'vin', '')) <> ''
    AND trim(coalesce(m.telaio_num, '')) <> ''
    AND upper(trim(sl.contenuto->'doc'->'campi'->>'vin')) <> upper(trim(m.telaio_num))
  )
ORDER BY l.created_at DESC
LIMIT 500;

-- Query 3: legacy senza mezzoLink.confirmed con mismatch ident
SELECT
  l.id AS lavorazione_id,
  l.mezzo_id,
  sl.contenuto->'doc'->'mezzoLink' AS mezzo_link,
  sl.contenuto->'doc'->'campi'->>'cliente' AS scheda_cliente,
  m.cliente AS mezzo_cliente,
  l.created_at
FROM lavorazioni l
JOIN scheda_lavorazione sl ON sl.lavorazione_id = l.id AND sl.tipo = 'ingresso'
JOIN mezzi m ON m.id = l.mezzo_id
WHERE (
    sl.contenuto->'doc'->'mezzoLink' IS NULL
    OR coalesce(sl.contenuto->'doc'->'mezzoLink'->>'confirmed', 'false') <> 'true'
  )
  AND trim(coalesce(sl.contenuto->'doc'->'campi'->>'cliente', '')) <> ''
  AND trim(coalesce(m.cliente, '')) <> ''
  AND lower(trim(sl.contenuto->'doc'->'campi'->>'cliente')) <> lower(trim(m.cliente))
  AND l.created_at >= now() - interval '90 days'
ORDER BY l.created_at DESC
LIMIT 500;
