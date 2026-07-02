-- Document Capture security hardening: expire RPC, events append-only, no direct capture INSERT

begin;

revoke execute on function public.expire_pending_document_captures(interval) from authenticated;
grant execute on function public.expire_pending_document_captures(interval) to service_role;

drop policy if exists cap_document_capture_events_insert on public.document_capture_events;

drop policy if exists cap_document_capture_insert on public.document_capture;
create policy cap_document_capture_insert on public.document_capture for insert to authenticated
with check (false);

create or replace function public.document_capture_events_append_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    raise exception 'document_capture_events is append-only';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_document_capture_events_append_only on public.document_capture_events;
create trigger trg_document_capture_events_append_only
before update or delete on public.document_capture_events
for each row execute function public.document_capture_events_append_only();

commit;
