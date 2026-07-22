-- Bulk label jobs: compact items with quantity (no expansion in DB).

alter table public.label_generation_jobs
  add column if not exists bulk_items jsonb;

comment on column public.label_generation_jobs.bulk_items is
  'Compact bulk print items [{id, quantity, preset?}] — expansion only at render time.';
