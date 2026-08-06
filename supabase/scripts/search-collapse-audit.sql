-- Audit diagnostico pre-migration: search_document vs collapse field tokens
-- Eseguire manualmente su staging/prod prima del backfill.
-- Obiettivo: quantificare incoerenze, collisioni, baseline matching.

-- ---------------------------------------------------------------------------
-- 1. Magazzino: codici con separatori vs query collapsed
-- ---------------------------------------------------------------------------
select
  'magazzino_separator_mismatch' as audit_kind,
  count(*) as row_count
from public.magazzino_ricambi r
where r.codice is not null
  and r.codice ~ '[.\-/ _]'
  and public.collapse_search_text(r.codice) <> ''
  and r.search_document not ilike '%' || public.collapse_search_text(r.codice) || '%';

select
  r.id,
  r.codice,
  r.search_document,
  public.collapse_search_text(r.codice) as codice_collapsed
from public.magazzino_ricambi r
where r.search_document ilike '%du3%'
   or r.codice ilike '%DU3%'
order by r.codice
limit 50;

-- ---------------------------------------------------------------------------
-- 2. Lavorazioni: cliente con punteggiatura
-- ---------------------------------------------------------------------------
select
  'lavorazioni_cliente_punct' as audit_kind,
  count(*) as row_count
from public.lavorazioni l
join public.mezzi m on m.id = l.mezzo_id
where m.cliente ~ '[.\-/]'
  and public.collapse_search_text(m.cliente) <> ''
  and l.search_document not ilike '%' || public.collapse_search_text(m.cliente) || '%';

-- ---------------------------------------------------------------------------
-- 3. Mezzi: targhe con separatori
-- ---------------------------------------------------------------------------
select
  m.id,
  m.targa,
  m.search_document,
  public.collapse_search_text(m.targa) as targa_collapsed
from public.mezzi m
where m.targa ~ '[-./ ]'
order by m.targa
limit 50;

-- ---------------------------------------------------------------------------
-- 4. Collisioni potenziali cross-campo (marca ABC + codice 123)
-- ---------------------------------------------------------------------------
select
  r.id,
  r.codice,
  r.marca,
  public.collapse_search_text(r.marca) as marca_c,
  public.collapse_search_text(r.codice) as codice_c,
  public.collapse_search_text(coalesce(r.marca, '') || coalesce(r.codice, '')) as concat_c
from public.magazzino_ricambi r
where public.collapse_search_text(r.marca) <> ''
  and public.collapse_search_text(r.codice) <> ''
  and length(public.collapse_search_text(r.marca)) >= 2
  and length(public.collapse_search_text(r.codice)) >= 2
limit 100;

-- ---------------------------------------------------------------------------
-- 5. Post-backfill sanity (eseguire dopo migration)
-- ---------------------------------------------------------------------------
-- select count(*) from magazzino_ricambi where search_document like '%codice:%';
-- select count(*) from lavorazioni where search_document like '%cliente:%';
