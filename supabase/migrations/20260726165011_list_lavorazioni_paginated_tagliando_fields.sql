-- list_lavorazioni_paginated: espone flag tagliando (badge lista / note).
-- Colonne già su lavorazioni da 20261027120000_tagliandi_integrati_lavorazioni.

create or replace function public.list_lavorazioni_paginated(
  p_mode text default 'all',
  p_limit int default 100,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_search text default null,
  p_stato text default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with norm as (
    select nullif(public.normalize_search_text(coalesce(p_search, '')), '') as q
  ),
  filtered as (
    select
      l.id,
      l.mezzo_id,
      l.stato,
      l.priorita,
      l.data_ingresso,
      l.data_uscita,
      l.note,
      l.created_by,
      l.created_at,
      l.updated_at,
      l.updated_by,
      l.archived,
      l.archived_at,
      l.codice,
      l.target_type,
      l.attrezzatura_id,
      l.is_tagliando,
      l.maintenance_execution_kind,
      l.repair_present,
      l.tagliando_preset_ref
    from public.lavorazioni l
    cross join norm n
    where l.deleted_at is null
      and (
        p_mode = 'all'
        or (p_mode = 'active' and l.archived = false)
        or (p_mode = 'closed' and l.archived = true)
      )
      and (p_stato is null or l.stato = p_stato)
      and (
        n.q is null
        or l.search_document like '%' || n.q || '%'
        or l.search_vector @@ websearch_to_tsquery('italian', p_search)
      )
      and (
        p_cursor_created_at is null
        or p_cursor_id is null
        or (l.created_at, l.id) < (p_cursor_created_at, p_cursor_id)
      )
    order by l.created_at desc nulls last, l.id desc
    limit least(greatest(coalesce(p_limit, 1), 1), 200)
  ),
  page_rows as (
    select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at desc, f.id desc), '[]'::jsonb) as rows
    from filtered f
  ),
  last_row as (
    select f.created_at, f.id
    from filtered f
    order by f.created_at desc, f.id desc
    limit 1
  )
  select jsonb_build_object(
    'rows', (select rows from page_rows),
    'next_cursor', case
      when (select count(*) from filtered) < least(greatest(coalesce(p_limit, 1), 1), 200) then null
      else jsonb_build_object(
        'created_at', (select created_at from last_row),
        'id', (select id from last_row)
      )
    end,
    'total_estimate', null
  );
$$;
