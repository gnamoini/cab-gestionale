-- Idempotent capture entity links (retry-safe apply).

begin;

create unique index if not exists uq_document_capture_links_entity
  on public.document_capture_links (capture_id, entity_type, entity_id, relation);

commit;
