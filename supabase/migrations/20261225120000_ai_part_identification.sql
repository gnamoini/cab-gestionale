-- Ricambi AI: document intelligence + part identification searches

begin;

-- ---------------------------------------------------------------------------
-- document_ai_index
-- ---------------------------------------------------------------------------
create table if not exists public.document_ai_index (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documenti(id) on delete cascade,
  version integer not null default 1,
  content_hash text not null,
  status text not null default 'pending',
  understanding_status text not null default 'pending',
  is_active boolean not null default true,
  gemini_store_name text,
  gemini_file_name text,
  operation_name text,
  index_quality text,
  document_capabilities jsonb not null default '{}'::jsonb,
  extraction_reliability text,
  error_code text,
  error_message text,
  attempt_count integer not null default 0,
  next_retry_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_ai_index_status_check check (
    status in ('pending', 'processing', 'indexed', 'failed', 'superseded')
  ),
  constraint document_ai_index_understanding_status_check check (
    understanding_status in ('pending', 'processing', 'ready', 'failed')
  ),
  constraint document_ai_index_quality_check check (
    index_quality is null or index_quality in ('high', 'medium', 'low', 'failed')
  ),
  constraint document_ai_index_extraction_reliability_check check (
    extraction_reliability is null
    or extraction_reliability in ('reliable', 'partial', 'visual_required', 'not_interpretable')
  ),
  constraint document_ai_index_documento_hash_unique unique (documento_id, content_hash)
);

create index if not exists idx_document_ai_index_status on public.document_ai_index (status, next_retry_at);
create index if not exists idx_document_ai_index_understanding on public.document_ai_index (understanding_status);
create index if not exists idx_document_ai_index_documento on public.document_ai_index (documento_id, is_active);
create index if not exists idx_document_ai_index_active_ready on public.document_ai_index (documento_id)
  where is_active = true and status = 'indexed' and understanding_status = 'ready';

-- ---------------------------------------------------------------------------
-- document_ai_pages
-- ---------------------------------------------------------------------------
create table if not exists public.document_ai_pages (
  id uuid primary key default gen_random_uuid(),
  index_id uuid not null references public.document_ai_index(id) on delete cascade,
  page_number integer not null,
  page_kind text not null default 'other',
  group_label text,
  extraction_level text,
  preview_storage_path text,
  quality_notes text,
  created_at timestamptz not null default now(),
  constraint document_ai_pages_kind_check check (
    page_kind in ('text', 'table', 'exploded', 'manual', 'cover', 'index', 'price_list', 'other')
  ),
  constraint document_ai_pages_extraction_level_check check (
    extraction_level is null or extraction_level in ('A', 'B', 'C')
  ),
  constraint document_ai_pages_index_page_unique unique (index_id, page_number)
);

create index if not exists idx_document_ai_pages_index on public.document_ai_pages (index_id);

-- ---------------------------------------------------------------------------
-- document_ai_exploded_views
-- ---------------------------------------------------------------------------
create table if not exists public.document_ai_exploded_views (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.document_ai_pages(id) on delete cascade,
  diagram_label text,
  bbox_json jsonb,
  extraction_reliability text,
  created_at timestamptz not null default now(),
  constraint document_ai_exploded_views_reliability_check check (
    extraction_reliability is null
    or extraction_reliability in ('reliable', 'partial', 'visual_required', 'not_interpretable')
  )
);

create index if not exists idx_document_ai_exploded_views_page on public.document_ai_exploded_views (page_id);

-- ---------------------------------------------------------------------------
-- document_ai_part_references
-- ---------------------------------------------------------------------------
create table if not exists public.document_ai_part_references (
  id uuid primary key default gen_random_uuid(),
  index_id uuid not null references public.document_ai_index(id) on delete cascade,
  page_id uuid not null references public.document_ai_pages(id) on delete cascade,
  exploded_view_id uuid references public.document_ai_exploded_views(id) on delete set null,
  position_number text,
  part_number_candidate text,
  part_number_verified text,
  description text,
  quantity text,
  notes text,
  source text not null default 'table',
  price_candidate jsonb,
  created_at timestamptz not null default now(),
  constraint document_ai_part_refs_source_check check (
    source in ('table', 'diagram', 'both', 'visual')
  )
);

create index if not exists idx_document_ai_part_refs_index on public.document_ai_part_references (index_id);
create index if not exists idx_document_ai_part_refs_page on public.document_ai_part_references (page_id);
create index if not exists idx_document_ai_part_refs_position on public.document_ai_part_references (index_id, position_number);

-- ---------------------------------------------------------------------------
-- ai_part_searches
-- ---------------------------------------------------------------------------
create table if not exists public.ai_part_searches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending',
  input_json jsonb not null default '{}'::jsonb,
  stages jsonb not null default '[]'::jsonb,
  sources_consulted jsonb not null default '[]'::jsonb,
  result_json jsonb,
  model_id text,
  prompt_versions jsonb not null default '{}'::jsonb,
  duration_ms integer,
  cancelled_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_candidate_id uuid,
  rejected_at timestamptz,
  rejection_note text,
  error_code text,
  error_message text,
  attempt_count integer not null default 0,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_part_searches_status_check check (
    status in ('draft', 'pending', 'processing', 'completed', 'failed', 'cancelled')
  )
);

create index if not exists idx_ai_part_searches_created_by on public.ai_part_searches (created_by, created_at desc);
create index if not exists idx_ai_part_searches_status on public.ai_part_searches (status, next_retry_at);

-- ---------------------------------------------------------------------------
-- ai_part_search_assets
-- ---------------------------------------------------------------------------
create table if not exists public.ai_part_search_assets (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.ai_part_searches(id) on delete cascade,
  storage_path text not null,
  kind text not null,
  content_hash text,
  mime_type text,
  file_size_bytes integer,
  created_at timestamptz not null default now(),
  constraint ai_part_search_assets_kind_check check (
    kind in ('part_photo', 'assembly_photo', 'label_photo', 'page_preview')
  )
);

create index if not exists idx_ai_part_search_assets_search on public.ai_part_search_assets (search_id);

-- ---------------------------------------------------------------------------
-- ai_part_candidates
-- ---------------------------------------------------------------------------
create table if not exists public.ai_part_candidates (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.ai_part_searches(id) on delete cascade,
  rank_order integer not null default 0,
  candidate_part_number text,
  verified_part_number text,
  manufacturer text,
  description text,
  compatibility_json jsonb not null default '[]'::jsonb,
  price_candidate jsonb,
  verified_price jsonb,
  confidence_score numeric(5, 4),
  confidence_band text,
  is_best_match boolean not null default false,
  created_at timestamptz not null default now(),
  constraint ai_part_candidates_confidence_band_check check (
    confidence_band is null or confidence_band in ('high', 'medium', 'low')
  )
);

create index if not exists idx_ai_part_candidates_search on public.ai_part_candidates (search_id, rank_order);

-- ---------------------------------------------------------------------------
-- ai_part_evidence
-- ---------------------------------------------------------------------------
create table if not exists public.ai_part_evidence (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.ai_part_searches(id) on delete cascade,
  candidate_id uuid references public.ai_part_candidates(id) on delete cascade,
  evidence_type text not null,
  document_id uuid references public.documenti(id) on delete set null,
  page_number integer,
  position_number text,
  url text,
  title text not null,
  excerpt text,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  constraint ai_part_evidence_type_check check (
    evidence_type in (
      'catalog', 'exploded_view', 'parts_table', 'price_list',
      'manufacturer', 'web', 'historical_confirmation', 'visual'
    )
  )
);

create index if not exists idx_ai_part_evidence_search on public.ai_part_evidence (search_id);
create index if not exists idx_ai_part_evidence_candidate on public.ai_part_evidence (candidate_id);

-- ---------------------------------------------------------------------------
-- Usable index helper (SSOT retrieval filter)
-- ---------------------------------------------------------------------------
create or replace function public.document_ai_index_is_usable(p_index_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.document_ai_index i
    where i.id = p_index_id
      and i.is_active = true
      and i.status = 'indexed'
      and i.understanding_status = 'ready'
  );
$$;

revoke all on function public.document_ai_index_is_usable(uuid) from public;
grant execute on function public.document_ai_index_is_usable(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.document_ai_index enable row level security;
alter table public.document_ai_pages enable row level security;
alter table public.document_ai_exploded_views enable row level security;
alter table public.document_ai_part_references enable row level security;
alter table public.ai_part_searches enable row level security;
alter table public.ai_part_search_assets enable row level security;
alter table public.ai_part_candidates enable row level security;
alter table public.ai_part_evidence enable row level security;

-- document intelligence: documenti module
create policy cap_document_ai_index_select on public.document_ai_index
  for select to authenticated using (public.rbac_module_can('documenti', 'read'));

create policy cap_document_ai_index_insert on public.document_ai_index
  for insert to authenticated with check (public.rbac_module_can('documenti', 'write'));

create policy cap_document_ai_index_update on public.document_ai_index
  for update to authenticated
  using (public.rbac_module_can('documenti', 'write'))
  with check (public.rbac_module_can('documenti', 'write'));

create policy cap_document_ai_pages_select on public.document_ai_pages
  for select to authenticated
  using (
    public.rbac_module_can('documenti', 'read')
    and public.document_ai_index_is_usable(index_id)
  );

create policy cap_document_ai_exploded_views_select on public.document_ai_exploded_views
  for select to authenticated
  using (
    public.rbac_module_can('documenti', 'read')
    and exists (
      select 1 from public.document_ai_pages p
      where p.id = page_id and public.document_ai_index_is_usable(p.index_id)
    )
  );

create policy cap_document_ai_part_refs_select on public.document_ai_part_references
  for select to authenticated
  using (
    public.rbac_module_can('documenti', 'read')
    and public.document_ai_index_is_usable(index_id)
  );

-- part searches: magazzino module
create policy cap_ai_part_searches_select on public.ai_part_searches
  for select to authenticated using (public.rbac_module_can('magazzino', 'read'));

create policy cap_ai_part_searches_insert on public.ai_part_searches
  for insert to authenticated with check (public.rbac_module_can('magazzino', 'write'));

create policy cap_ai_part_searches_update on public.ai_part_searches
  for update to authenticated
  using (public.rbac_module_can('magazzino', 'write'))
  with check (public.rbac_module_can('magazzino', 'write'));

create policy cap_ai_part_search_assets_select on public.ai_part_search_assets
  for select to authenticated
  using (
    public.rbac_module_can('magazzino', 'read')
    and exists (select 1 from public.ai_part_searches s where s.id = search_id)
  );

create policy cap_ai_part_search_assets_insert on public.ai_part_search_assets
  for insert to authenticated with check (public.rbac_module_can('magazzino', 'write'));

create policy cap_ai_part_candidates_select on public.ai_part_candidates
  for select to authenticated
  using (
    public.rbac_module_can('magazzino', 'read')
    and exists (select 1 from public.ai_part_searches s where s.id = search_id)
  );

create policy cap_ai_part_evidence_select on public.ai_part_evidence
  for select to authenticated
  using (
    public.rbac_module_can('magazzino', 'read')
    and exists (select 1 from public.ai_part_searches s where s.id = search_id)
  );

grant select, insert, update on public.document_ai_index to authenticated;
grant select on public.document_ai_pages to authenticated;
grant select on public.document_ai_exploded_views to authenticated;
grant select on public.document_ai_part_references to authenticated;
grant select, insert, update on public.ai_part_searches to authenticated;
grant select, insert on public.ai_part_search_assets to authenticated;
grant select on public.ai_part_candidates to authenticated;
grant select on public.ai_part_evidence to authenticated;

-- ---------------------------------------------------------------------------
-- Storage RLS: ai_part_search scope on images bucket
-- ---------------------------------------------------------------------------
create or replace function public.rbac_storage_images_path_allowed(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_path text;
  v_scope text;
  v_record_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_path := trim(both '/' from coalesce(p_object_name, ''));
  if v_path = '' then
    return false;
  end if;

  v_scope := (storage.foldername(p_object_name))[1];

  if v_scope = 'ai_part_search' then
    if not public.user_effective_can('magazzino', 'read') then
      return false;
    end if;
    begin
      v_record_id := ((storage.foldername(p_object_name))[2])::uuid;
    exception
      when others then
        return false;
    end;
    return exists (select 1 from public.ai_part_searches s where s.id = v_record_id);
  end if;

  if v_scope not in ('mezzi', 'magazzino', 'lavorazioni') then
    return false;
  end if;

  begin
    v_record_id := ((storage.foldername(p_object_name))[2])::uuid;
  exception
    when others then
      return false;
  end;

  if v_scope = 'lavorazioni' then
    if public.rbac_is_cliente() then
      return public.rbac_lavorazione_visible_to_cliente(v_record_id);
    end if;
    if not public.user_effective_can('lavorazioni', 'read') then
      return false;
    end if;
    return public.rbac_can_read_row('lavorazioni', v_record_id);
  end if;

  if public.rbac_is_cliente() then
    return false;
  end if;

  if v_scope = 'mezzi' then
    if not public.user_effective_can('mezzi', 'read') then
      return false;
    end if;
    return public.rbac_can_read_row('mezzi', v_record_id);
  end if;

  if v_scope = 'magazzino' then
    if not public.user_effective_can('magazzino', 'read') then
      return false;
    end if;
    return exists (
      select 1 from public.magazzino_ricambi m where m.id = v_record_id
    );
  end if;

  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- RBAC page: identifica_ricambio
-- ---------------------------------------------------------------------------
insert into public.rbac_page_module_expansion (page_key, module)
values ('identifica_ricambio', 'magazzino')
on conflict do nothing;

insert into public.role_page_access (role_id, page_key, access_level)
select rpa.role_id, 'identifica_ricambio', rpa.access_level
from public.role_page_access rpa
where rpa.page_key = 'magazzino'
on conflict (role_id, page_key) do nothing;

insert into public.user_page_overrides (user_id, page_key, access_level)
select upo.user_id, 'identifica_ricambio', upo.access_level
from public.user_page_overrides upo
where upo.page_key = 'magazzino'
on conflict (user_id, page_key) do nothing;

commit;
