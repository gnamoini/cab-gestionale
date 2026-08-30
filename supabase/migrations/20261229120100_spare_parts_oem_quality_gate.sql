-- OEM triple-store, ready_with_warnings, usable index v2

alter table public.document_ai_part_references
  add column if not exists part_number_raw text,
  add column if not exists part_number_normalized text,
  add column if not exists part_number_search text;

update public.document_ai_part_references
set
  part_number_raw = coalesce(part_number_raw, part_number_verified, part_number_candidate),
  part_number_normalized = coalesce(
    part_number_normalized,
    upper(trim(coalesce(part_number_verified, part_number_candidate, '')))
  ),
  part_number_search = coalesce(
    part_number_search,
    regexp_replace(
      regexp_replace(upper(trim(coalesce(part_number_verified, part_number_candidate, ''))), '\.', 'DOT', 'g'),
      '-',
      'HYPH',
      'g'
    )
  )
where part_number_raw is null
   or part_number_normalized is null
   or part_number_search is null;

create index if not exists idx_document_ai_part_refs_search
  on public.document_ai_part_references (index_id, part_number_search)
  where part_number_search is not null and part_number_search <> '';

alter table public.document_ai_index
  drop constraint if exists document_ai_index_understanding_status_check;

alter table public.document_ai_index
  add constraint document_ai_index_understanding_status_check check (
    understanding_status in ('pending', 'processing', 'ready', 'ready_with_warnings', 'failed')
  );

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
      and i.understanding_status in ('ready', 'ready_with_warnings')
      and coalesce(i.index_quality, '') <> 'failed'
      and exists (
        select 1
        from public.document_ai_part_references pr
        join public.document_ai_pages pg on pg.id = pr.page_id
        where pr.index_id = i.id
          and pg.page_number is not null
          and pg.page_number > 0
      )
  );
$$;

revoke all on function public.document_ai_index_is_usable(uuid) from public;
grant execute on function public.document_ai_index_is_usable(uuid) to authenticated;
