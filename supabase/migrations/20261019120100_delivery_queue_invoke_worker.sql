-- SSOT v4: invoke Vercel delivery worker on delivery_queue insert (same as legacy push_delivery_queue).

begin;

create or replace function public.trg_delivery_queue_invoke_worker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cab_invoke_push_delivery_worker();
  return new;
end;
$$;

drop trigger if exists delivery_queue_invoke_worker on public.delivery_queue;
create trigger delivery_queue_invoke_worker
  after insert on public.delivery_queue
  for each row
  execute function public.trg_delivery_queue_invoke_worker();

commit;
