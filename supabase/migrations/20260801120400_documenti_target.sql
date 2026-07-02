-- R3: target intervento su documenti

alter table public.ddt_documents add column if not exists target_type text;
alter table public.ddt_documents add column if not exists attrezzatura_id uuid references public.attrezzature (id) on delete set null;
alter table public.ddt_documents add column if not exists attrezzatura_snapshot jsonb not null default '{}'::jsonb;

comment on column public.ddt_documents.target_type is 'telaio | attrezzatura — snapshot al momento emissione DDT.';
comment on column public.ddt_documents.attrezzatura_snapshot is 'Snapshot attrezzatura al momento emissione DDT.';
