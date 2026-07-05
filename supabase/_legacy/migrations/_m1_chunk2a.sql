-- ---------------------------------------------------------------------------
-- document_capture
-- ---------------------------------------------------------------------------

create table if not exists public.document_capture (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  storage_path text not null,
  sha256 text,
  mime text,
  file_name text not null,
  file_size_bytes bigint,
  expected_mime text,
  storage_version text,
  storage_etag text,
  capture_version integer not null default 1,
  finalized_at timestamptz,
  duplicate_of uuid references public.document_capture (id) on delete set null,
  source text not null,
  document_category text not null default 'altro',
  scheda_tipo text,
  status text not null default 'pending_upload',
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  lavorazione_id uuid references public.lavorazioni (id) on delete set null,
  mezzo_id uuid references public.mezzi (id) on delete set null,
  attrezzatura_id uuid references public.attrezzature (id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  deletion_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_capture_scheda_tipo_chk check (
    scheda_tipo is null or document_category = 'scheda_officina'
  ),
  constraint document_capture_status_chk check (
    status in (
      'pending_upload', 'expired_upload', 'uploaded', 'review_required',
      'analyzing', 'review', 'dry_run', 'applied', 'archived', 'failed'
    )
  ),
  constraint document_capture_category_chk check (
    document_category in ('scheda_officina', 'documento_amministrativo', 'foto', 'altro')
  ),
  constraint document_capture_scheda_tipo_values_chk check (
    scheda_tipo is null or scheda_tipo in ('ingresso', 'lavorazioni', 'ricambi')
  ),
  constraint document_capture_finalized_sha_chk check (
    finalized_at is null or sha256 is not null
  ),
  constraint document_capture_deletion_reason_chk check (
    deleted_at is null or (deletion_reason is not null and char_length(trim(deletion_reason)) >= 3)
  )
);

create unique index if not exists uq_document_capture_company_sha256_finalized
  on public.document_capture (company_id, sha256)
  where deleted_at is null and finalized_at is not null and sha256 is not null;

create index if not exists idx_document_capture_company_status
  on public.document_capture (company_id, status)
  where deleted_at is null;

create index if not exists idx_document_capture_pending_ttl
  on public.document_capture (uploaded_at)
  where status = 'pending_upload' and finalized_at is null and deleted_at is null;

drop trigger if exists trg_document_capture_updated_at on public.document_capture;
create trigger trg_document_capture_updated_at
before update on public.document_capture
for each row execute function public.set_updated_at();

-- Immutabilità post-finalize
create or replace function public.document_capture_guard_post_finalize()
returns trigger
language plpgsql
as $$
begin
  if old.finalized_at is not null then
    if new.storage_path is distinct from old.storage_path
      or new.sha256 is distinct from old.sha256
      or new.mime is distinct from old.mime
      or new.file_size_bytes is distinct from old.file_size_bytes
      or new.company_id is distinct from old.company_id
      or new.storage_version is distinct from old.storage_version
      or new.storage_etag is distinct from old.storage_etag
    then
      raise exception 'document_capture immutabile dopo finalize';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_document_capture_guard_post_finalize on public.document_capture;
create trigger trg_document_capture_guard_post_finalize
before update on public.document_capture
for each row execute function public.document_capture_guard_post_finalize();