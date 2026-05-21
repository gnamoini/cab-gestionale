-- PDF strutturati per lavorazione: preventivo upload manuale + DDT (max 1 per tipo).

create table if not exists public.lavorazione_documents (
  lavorazione_id uuid not null references public.lavorazioni (id) on delete cascade,
  tipo text not null check (tipo in ('preventivo_upload', 'ddt')),
  storage_path text not null,
  filename text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users (id) on delete set null,
  primary key (lavorazione_id, tipo)
);

create index if not exists idx_lavorazione_documents_lavorazione
  on public.lavorazione_documents (lavorazione_id);

comment on table public.lavorazione_documents is
  'PDF allegati lavorazione: preventivo esterno (upload) e DDT. Un file per tipo.';
comment on column public.lavorazione_documents.tipo is
  'preventivo_upload = PDF preventivo cliente esterno; ddt = documento di trasporto.';

alter table public.lavorazione_documents enable row level security;

drop policy if exists rbac_lavorazione_documents_select on public.lavorazione_documents;
create policy rbac_lavorazione_documents_select on public.lavorazione_documents
for select to authenticated
using (public.rbac_can_read_row('lavorazioni', lavorazione_id));

drop policy if exists rbac_lavorazione_documents_insert on public.lavorazione_documents;
create policy rbac_lavorazione_documents_insert on public.lavorazione_documents
for insert to authenticated
with check (
  public.rbac_can_write('lavorazioni')
  and public.rbac_can_read_row('lavorazioni', lavorazione_id)
);

drop policy if exists rbac_lavorazione_documents_update on public.lavorazione_documents;
create policy rbac_lavorazione_documents_update on public.lavorazione_documents
for update to authenticated
using (
  public.rbac_can_write('lavorazioni')
  and public.rbac_can_read_row('lavorazioni', lavorazione_id)
)
with check (
  public.rbac_can_write('lavorazioni')
  and public.rbac_can_read_row('lavorazioni', lavorazione_id)
);

drop policy if exists rbac_lavorazione_documents_delete on public.lavorazione_documents;
create policy rbac_lavorazione_documents_delete on public.lavorazione_documents
for delete to authenticated
using (
  public.rbac_can_write('lavorazioni')
  and public.rbac_can_read_row('lavorazioni', lavorazione_id)
);

-- Realtime
do $$
begin
  alter publication supabase_realtime add table public.lavorazione_documents;
exception
  when duplicate_object then null;
end $$;

-- Storage: lettura PDF lavorazioni per clienti (path lavorazioni/{uuid}/preventivo.pdf|ddt.pdf)
drop policy if exists rbac_storage_documenti_lavorazioni_cliente_select on storage.objects;
create policy rbac_storage_documenti_lavorazioni_cliente_select on storage.objects
for select to authenticated
using (
  bucket_id = 'documenti'
  and (storage.foldername(name))[1] = 'lavorazioni'
  and coalesce((storage.foldername(name))[2], '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.rbac_lavorazione_visible_to_cliente(((storage.foldername(name))[2])::uuid)
);
