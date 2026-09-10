-- FASE 1: remove UnoERP integration schema (explicit DROP only, no CASCADE).

begin;

drop policy if exists unoerp_document_links_select on public.unoerp_document_links;
drop policy if exists unoerp_customer_mappings_select on public.unoerp_customer_mappings;

drop table if exists public.unoerp_sync_jobs;
drop table if exists public.unoerp_sync_audit;
drop table if exists public.unoerp_document_links;
drop table if exists public.unoerp_schema_fingerprints;
drop table if exists public.unoerp_item_mappings;
drop table if exists public.unoerp_service_mappings;
drop table if exists public.unoerp_customer_mappings;

drop trigger if exists trg_ddt_source_version on public.ddt_documents;
drop function if exists public.bump_ddt_source_version();
alter table public.ddt_documents drop column if exists source_version;

commit;
