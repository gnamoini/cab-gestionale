-- Document Capture v4.1 — document_model + pipeline_state + extraction_result

begin;

alter table public.document_capture
  add column if not exists document_model jsonb,
  add column if not exists pipeline_state jsonb;

alter table public.document_capture_attempts
  add column if not exists extraction_result jsonb,
  add column if not exists prompt_contract_id text,
  add column if not exists prompt_version text,
  add column if not exists metadata jsonb;

alter table public.document_capture_events
  drop constraint if exists document_capture_events_type_chk;

alter table public.document_capture_events
  add constraint document_capture_events_type_chk check (
    event_type in (
      'policy_created', 'storage_uploaded', 'finalized', 'duplicate_detected',
      'expiration', 'status_changed', 'category_changed', 'linked', 'archived', 'soft_deleted',
      'analyze_started', 'analyze_completed', 'analyze_failed', 'fields_confirmed',
      'dry_run', 'apply_started', 'apply_committed', 'apply_failed', 'apply_partial',
      'pipeline_phase_completed', 'field_overridden', 'document_edited',
      'validation_reviewed', 'apply_approved'
    )
  );

comment on column public.document_capture.document_model is
  'SSOT DocumentModel v4.1 — pagine/sezioni/campi versionati';
comment on column public.document_capture.pipeline_state is
  'Composite pipeline state — solo Orchestrator (COH-04)';

commit;
