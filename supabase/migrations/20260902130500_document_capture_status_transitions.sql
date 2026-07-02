-- Document Capture status transitions (mirror capture-status.ts)

begin;

create or replace function public.document_capture_assert_status_transition(p_from text, p_to text)
returns void
language plpgsql
immutable
as $$
begin
  if p_from = p_to then
    return;
  end if;

  if p_from = 'pending_upload' and p_to in ('uploaded', 'failed', 'expired_upload') then return; end if;
  if p_from = 'expired_upload' and p_to = 'archived' then return; end if;
  if p_from = 'uploaded' and p_to in ('archived', 'failed', 'analyzing', 'review_required') then return; end if;
  if p_from = 'analyzing' and p_to in ('review', 'failed') then return; end if;
  if p_from = 'review' and p_to in ('dry_run', 'archived', 'failed') then return; end if;
  if p_from = 'review_required' and p_to in ('analyzing', 'archived', 'failed') then return; end if;
  if p_from = 'dry_run' and p_to in ('applied', 'failed', 'review') then return; end if;
  if p_from = 'applied' and p_to = 'archived' then return; end if;
  if p_from = 'failed' and p_to = 'archived' then return; end if;
  if p_from = 'archived' then
    raise exception 'Transizione non consentita: % → %', p_from, p_to;
  end if;

  raise exception 'Transizione non consentita: % → %', p_from, p_to;
end;
$$;

grant execute on function public.document_capture_assert_status_transition(text, text) to authenticated;

commit;
