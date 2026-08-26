-- INT-004: email delivery idempotency (delivery_operation_id)

alter table public.communication_send_queue
  add column if not exists delivery_operation_id uuid;

create unique index if not exists communication_send_queue_delivery_op_uidx
  on public.communication_send_queue (delivery_operation_id)
  where delivery_operation_id is not null;

create table if not exists public.communication_delivery_dedup (
  delivery_operation_id uuid primary key,
  provider_message_id text,
  accepted_at timestamptz not null default now()
);

revoke all on public.communication_delivery_dedup from public, anon, authenticated;
grant select, insert on public.communication_delivery_dedup to service_role;

notify pgrst, 'reload schema';
