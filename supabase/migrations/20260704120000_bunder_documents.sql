-- BUNDER: documenti commerciali persistiti su Postgres (migrazione da localStorage).

create table if not exists public.bunder_documents (
  id text primary key,
  kind text not null,
  numero_progressivo text not null default '',
  data_documento date not null default current_date,
  azienda_destinatario text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_by text not null default '',
  last_edited_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bunder_documents_kind_idx on public.bunder_documents (kind);
create index if not exists bunder_documents_data_documento_idx on public.bunder_documents (data_documento desc);
create index if not exists bunder_documents_updated_at_idx on public.bunder_documents (updated_at desc);

comment on table public.bunder_documents is 'Documenti commerciali BUNDER; payload JSON completo del modello UI.';

alter table public.bunder_documents enable row level security;

drop policy if exists bunder_documents_select on public.bunder_documents;
create policy bunder_documents_select on public.bunder_documents
  for select to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_read_operational'));

drop policy if exists bunder_documents_insert on public.bunder_documents;
create policy bunder_documents_insert on public.bunder_documents
  for insert to authenticated
  with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational'));

drop policy if exists bunder_documents_update on public.bunder_documents;
create policy bunder_documents_update on public.bunder_documents
  for update to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational'))
  with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational'));

drop policy if exists bunder_documents_delete on public.bunder_documents;
create policy bunder_documents_delete on public.bunder_documents
  for delete to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational'));

do $$
begin
  alter publication supabase_realtime add table public.bunder_documents;
exception
  when duplicate_object then null;
end $$;
