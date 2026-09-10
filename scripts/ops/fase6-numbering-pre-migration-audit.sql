-- FASE 6 — Pre-migration numbering audit (READ-ONLY)
-- Eseguire prima del motore centralizzato. Non modifica dati.

-- ---------------------------------------------------------------------------
-- DATA BASELINE GATE — conteggi documenti fiscali
-- ---------------------------------------------------------------------------
select 'baseline_invoices_total' as report, count(*)::bigint as cnt from public.invoices;
select 'baseline_invoices_fattura' as report, count(*)::bigint as cnt
from public.invoices where coalesce(document_type, 'fattura') = 'fattura';
select 'baseline_invoices_nota_credito' as report, count(*)::bigint as cnt
from public.invoices where document_type = 'nota_credito';
select 'baseline_preventivi_total' as report, count(*)::bigint as cnt from public.preventivi;
select 'baseline_ddt_confirmed' as report, count(*)::bigint as cnt
from public.ddt_documents where numero is not null and status <> 'annullato';

-- ---------------------------------------------------------------------------
-- Duplicati fatture legacy (anno, numero) — pre-split FT/NC
-- ---------------------------------------------------------------------------
select 'invoices_anno_numero_dup' as report,
       anno,
       numero,
       count(*) as cnt,
       array_agg(id) as record_ids,
       array_agg(document_type) as document_types
from public.invoices
where numero is not null
group by anno, numero
having count(*) > 1;

-- ---------------------------------------------------------------------------
-- Duplicati potenziali post-migrazione (company, type, anno, series, numero)
-- Assumes company_id backfill to default company when null.
-- ---------------------------------------------------------------------------
select 'invoices_future_key_dup' as report,
       coalesce(company_id, '00000000-0000-4000-8000-000000000001'::uuid) as company_id,
       coalesce(document_type, 'fattura') as document_type,
       anno,
       coalesce(nullif(upper(trim(series)), ''), 'DEFAULT') as series_norm,
       numero,
       count(*) as cnt,
       array_agg(id) as record_ids
from public.invoices
where numero is not null
  and coalesce(document_status, status) <> 'annullata'
group by 1, 2, 3, 4, 5
having count(*) > 1;

-- ---------------------------------------------------------------------------
-- DDT: max progressivo per chiave (seed condizionale)
-- ---------------------------------------------------------------------------
select 'ddt_max_by_key' as report,
       '00000000-0000-4000-8000-000000000001'::uuid as company_id,
       'ddt'::text as document_type,
       anno as fiscal_year,
       coalesce(nullif(upper(trim(serie)), ''), 'DEFAULT') as series_norm,
       max(numero) as max_progressive,
       count(*) as doc_count
from public.ddt_documents
where numero is not null and status <> 'annullato'
group by anno, coalesce(nullif(upper(trim(serie)), ''), 'DEFAULT');

-- ---------------------------------------------------------------------------
-- DDT: collisioni attive (anno, serie, numero)
-- ---------------------------------------------------------------------------
select 'ddt_active_key_dup' as report,
       anno,
       coalesce(nullif(upper(trim(serie)), ''), 'DEFAULT') as series_norm,
       numero,
       count(*) as cnt,
       array_agg(id) as record_ids
from public.ddt_documents
where numero is not null and status <> 'annullato'
group by anno, coalesce(nullif(upper(trim(serie)), ''), 'DEFAULT'), numero
having count(*) > 1;

-- ---------------------------------------------------------------------------
-- Legacy counter tables — stato
-- ---------------------------------------------------------------------------
select 'legacy_invoice_number_sequences' as report, count(*)::bigint as cnt
from public.invoice_number_sequences;
select 'legacy_ddt_numero_counters' as report, count(*)::bigint as cnt
from public.ddt_numero_counters;

-- ---------------------------------------------------------------------------
-- Bozze fattura con numero (incompatibili con emit-only numbering)
-- ---------------------------------------------------------------------------
select 'invoices_draft_with_numero' as report, id, numero, anno, status, document_status
from public.invoices
where numero is not null
  and coalesce(document_status, status) in ('bozza', 'da_verificare');

-- GATE: se baseline_invoices_* > 0 o duplicati o draft_with_numero → REQUIRES_MANUAL_REVIEW
