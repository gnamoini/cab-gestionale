-- Audit / Event Subsystem P1: colonne additive (nullable) + indici.

alter table public.log_modifiche
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists event_type text,
  add column if not exists actor_type text,
  add column if not exists correlation_id uuid,
  add column if not exists request_id uuid,
  add column if not exists module text,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists severity text,
  add column if not exists category text;

create index if not exists idx_log_modifiche_company_created
  on public.log_modifiche (company_id, created_at desc)
  where company_id is not null;

create index if not exists idx_log_modifiche_entity_created
  on public.log_modifiche (entita, entita_id, created_at desc);

create index if not exists idx_log_modifiche_actor_created
  on public.log_modifiche (autore_id, created_at desc)
  where autore_id is not null;

create index if not exists idx_log_modifiche_correlation
  on public.log_modifiche (correlation_id)
  where correlation_id is not null;

create index if not exists idx_log_modifiche_request
  on public.log_modifiche (request_id)
  where request_id is not null;

create index if not exists idx_log_modifiche_event_type_company
  on public.log_modifiche (company_id, event_type, created_at desc)
  where company_id is not null and event_type is not null;

comment on column public.log_modifiche.event_type is
  'DATA_CHANGE | WORKFLOW_ACTION | SECURITY_ACTION | SYSTEM_EVENT | IMPORT_EVENT';
comment on column public.log_modifiche.actor_type is
  'USER | SYSTEM | AI | API | IMPORT | SCHEDULER';
comment on column public.log_modifiche.correlation_id is
  'Business operation correlation (import saga, batch workflow)';
comment on column public.log_modifiche.request_id is
  'Single HTTP/RPC request id for technical debugging';
