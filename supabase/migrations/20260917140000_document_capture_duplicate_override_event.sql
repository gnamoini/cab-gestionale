-- Allow duplicate_override audit event on document capture timeline.

begin;

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
      'validation_reviewed', 'apply_approved', 'entity_resolution_confirmed',
      'duplicate_override'
    )
  );

commit;
