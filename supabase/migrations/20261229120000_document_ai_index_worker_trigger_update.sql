-- Sveglia worker document_ai_index anche su re-enqueue (UPSERT update), come ai_part_searches.

begin;

create or replace function public.trg_document_ai_index_invoke_worker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending'
    and new.is_active
    and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.cab_invoke_spare_parts_document_index_worker();
  end if;
  return new;
end;
$$;

drop trigger if exists document_ai_index_invoke_worker on public.document_ai_index;
create trigger document_ai_index_invoke_worker
  after insert or update of status on public.document_ai_index
  for each row
  execute function public.trg_document_ai_index_invoke_worker();

commit;
