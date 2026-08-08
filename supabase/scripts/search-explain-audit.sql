-- EXPLAIN (ANALYZE, BUFFERS) audit for toolbar search paths.
-- Run manually on staging; does not block application deploy.
-- Target: no unexpected seq scans; typical query <200ms.

-- ---------------------------------------------------------------------------
-- 1. PostgREST-style ILIKE on search_document (magazzino/preventivi fetch)
-- ---------------------------------------------------------------------------
explain (analyze, buffers, format text)
select id, codice, search_document
from public.magazzino_ricambi
where search_document ilike '%du3rcpp%'
  and search_document ilike '%iveko%'
limit 50;

-- ---------------------------------------------------------------------------
-- 2. search_document_matches_tokens (RPC predicate SSOT)
-- ---------------------------------------------------------------------------
explain (analyze, buffers, format text)
select id, codice
from public.magazzino_ricambi r
where public.search_document_matches_tokens(r.search_document, 'du3 iveko')
limit 50;

-- ---------------------------------------------------------------------------
-- 3. list_lavorazioni_paginated with search
-- ---------------------------------------------------------------------------
explain (analyze, buffers, format text)
select *
from public.list_lavorazioni_paginated(
  p_mode := 'attive',
  p_limit := 50,
  p_cursor_created_at := null,
  p_cursor_id := null,
  p_search := 'iveko hb440',
  p_stato := null
);

-- ---------------------------------------------------------------------------
-- 4. FTS fallback on search_vector
-- ---------------------------------------------------------------------------
explain (analyze, buffers, format text)
select id, codice
from public.magazzino_ricambi r
where r.search_vector @@ websearch_to_tsquery('italian', 'pompa idraulica')
limit 50;

-- ---------------------------------------------------------------------------
-- 5. Index usage sanity (GIN on search_document / search_vector)
-- ---------------------------------------------------------------------------
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where tablename in ('magazzino_ricambi', 'lavorazioni', 'preventivi', 'mezzi')
  and indexdef ilike '%search_document%'
   or indexdef ilike '%search_vector%'
order by tablename, indexname;
