-- Search collapse field tokens: Unicode-safe collapse, marker campo, RPC match SSOT

begin;

-- ---------------------------------------------------------------------------
-- SSOT collapse (allineato a lib/search/field-token.ts collapseSearchKey)
-- ---------------------------------------------------------------------------

create or replace function public.collapse_search_text(input text)
returns text
language sql
immutable
parallel safe
as $$
  select regexp_replace(
    lower(extensions.unaccent(trim(coalesce(input, '')))),
    '[^a-z0-9]',
    '',
    'g'
  )
$$;

create or replace function public.format_field_search_token(p_field text, p_value text)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when public.collapse_search_text(p_value) = '' then null
    else p_field || ':' || public.collapse_search_text(p_value)
  end
$$;

create or replace function public.search_document_matches_tokens(p_doc text, p_query text)
returns boolean
language sql
immutable
parallel safe
as $$
  select case
    when nullif(public.normalize_search_text(coalesce(p_query, '')), '') is null then true
    when coalesce(p_doc, '') = '' then false
    else not exists (
      select 1
      from unnest(regexp_split_to_array(public.normalize_search_text(p_query), '\s+')) as t(token)
      where token <> ''
        and public.collapse_search_text(token) <> ''
        and p_doc not like '%' || public.collapse_search_text(token) || '%'
    )
  end
$$;

-- ---------------------------------------------------------------------------
-- build_*_search_document con marker campo
-- ---------------------------------------------------------------------------

create or replace function public.build_lavorazione_search_document(p_lavorazione_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select concat_ws(' ',
    public.normalize_search_text(
      concat_ws(' ',
        l.codice,
        l.note,
        l.stato::text,
        l.priorita::text,
        m.targa,
        m.numero_scuderia,
        m.telaio_num,
        m.marca_telaio,
        m.modello_telaio,
        m.tipo_telaio,
        m.cliente,
        m.utilizzatore,
        (
          select string_agg(s.contenuto::text, ' ')
          from public.scheda_lavorazione s
          where s.lavorazione_id = l.id
        )
      )
    ),
    public.format_field_search_token('codice', l.codice),
    public.format_field_search_token('note', l.note),
    public.format_field_search_token('targa', m.targa),
    public.format_field_search_token('telaio', m.telaio_num),
    public.format_field_search_token('cliente', m.cliente),
    public.format_field_search_token('cliente', m.utilizzatore),
    public.format_field_search_token('descrizione', l.note)
  )
  from public.lavorazioni l
  left join public.mezzi m on m.id = l.mezzo_id
  where l.id = p_lavorazione_id
$$;

create or replace function public.build_magazzino_search_document(p_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select concat_ws(' ',
    public.normalize_search_text(
      concat_ws(' ', r.codice, r.nome, r.marca, r.meta::text)
    ),
    public.format_field_search_token('codice', r.codice),
    public.format_field_search_token('descrizione', r.nome),
    public.format_field_search_token('marca', r.marca)
  )
  from public.magazzino_ricambi r
  where r.id = p_id
$$;

create or replace function public.build_preventivo_search_document(p_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select concat_ws(' ',
    public.normalize_search_text(
      concat_ws(' ',
        p.cliente,
        p.dettagli::text,
        m.targa,
        m.marca_telaio,
        m.modello_telaio,
        m.cliente
      )
    ),
    public.format_field_search_token('cliente', p.cliente),
    public.format_field_search_token('targa', m.targa),
    public.format_field_search_token('document', p.id::text)
  )
  from public.preventivi p
  left join public.mezzi m on m.id = p.mezzo_id
  where p.id = p_id
$$;

create or replace function public.build_mezzo_search_document(p_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select concat_ws(' ',
    public.normalize_search_text(
      concat_ws(' ',
        m.cliente,
        m.utilizzatore,
        m.targa,
        m.numero_scuderia,
        m.marca_telaio,
        m.modello_telaio,
        m.tipo_telaio,
        m.telaio_num,
        (
          select string_agg(distinct a.matricola, ' ')
          from public.attrezzature a
          where a.mezzo_id = m.id
            and a.matricola is not null
            and trim(a.matricola) <> ''
        )
      )
    ),
    public.format_field_search_token('cliente', m.cliente),
    public.format_field_search_token('cliente', m.utilizzatore),
    public.format_field_search_token('targa', m.targa),
    public.format_field_search_token('telaio', m.telaio_num),
    public.format_field_search_token('matricola', (
      select string_agg(distinct a.matricola, ' ')
      from public.attrezzature a
      where a.mezzo_id = m.id
        and a.matricola is not null
        and trim(a.matricola) <> ''
    ))
  )
  from public.mezzi m
  where m.id = p_id
$$;

create or replace function public.build_ordine_fornitore_search_document(p_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select concat_ws(' ',
    public.normalize_search_text(
      concat_ws(' ',
        o.numero,
        o.fornitore_label,
        o.note,
        o.destinazione,
        (
          select string_agg(concat_ws(' ', r.codice, r.descrizione), ' ')
          from public.ordini_fornitori_righe r
          where r.ordine_id = o.id
        )
      )
    ),
    public.format_field_search_token('document', o.numero),
    public.format_field_search_token('cliente', o.fornitore_label),
    public.format_field_search_token('note', o.note)
  )
  from public.ordini_fornitori o
  where o.id = p_id
$$;

create or replace function public.build_invoice_search_document(p_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select concat_ws(' ',
    public.normalize_search_text(
      concat_ws(' ',
        i.cliente_label,
        i.numero::text,
        i.anno::text,
        i.note,
        i.status
      )
    ),
    public.format_field_search_token('cliente', i.cliente_label),
    public.format_field_search_token('document', i.numero::text),
    public.format_field_search_token('note', i.note)
  )
  from public.invoices i
  where i.id = p_id
$$;

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------

update public.lavorazioni l
set search_document = coalesce(public.build_lavorazione_search_document(l.id), '');

update public.magazzino_ricambi r
set search_document = coalesce(public.build_magazzino_search_document(r.id), '');

update public.preventivi p
set search_document = coalesce(public.build_preventivo_search_document(p.id), '');

update public.mezzi m
set search_document = coalesce(public.build_mezzo_search_document(m.id), '');

update public.ordini_fornitori o
set search_document = coalesce(public.build_ordine_fornitore_search_document(o.id), '');

update public.invoices i
set search_document = coalesce(public.build_invoice_search_document(i.id), '');

-- ---------------------------------------------------------------------------
-- RPC: search con search_document_matches_tokens
-- ---------------------------------------------------------------------------

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
      l.attrezzatura_id
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
        or public.search_document_matches_tokens(l.search_document, p_search)
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

create or replace function public.list_magazzino_paginated(
  p_limit int default 100,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_search text default null
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
    select r.*
    from public.magazzino_ricambi r
    cross join norm n
    where (
      n.q is null
      or public.search_document_matches_tokens(r.search_document, p_search)
      or r.search_vector @@ websearch_to_tsquery('italian', p_search)
    )
    and (
      p_cursor_created_at is null
      or p_cursor_id is null
      or (r.created_at, r.id) < (p_cursor_created_at, p_cursor_id)
    )
    order by r.created_at desc nulls last, r.id desc
    limit least(greatest(coalesce(p_limit, 1), 1), 200)
  ),
  page_rows as (
    select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at desc, f.id desc), '[]'::jsonb) as rows
    from filtered f
  ),
  last_row as (
    select f.created_at, f.id from filtered f
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

create or replace function public.list_preventivi_paginated(
  p_limit int default 100,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_search text default null
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
    select p.*
    from public.preventivi p
    cross join norm n
    where (
      n.q is null
      or public.search_document_matches_tokens(p.search_document, p_search)
      or p.search_vector @@ websearch_to_tsquery('italian', p_search)
    )
    and (
      p_cursor_created_at is null
      or p_cursor_id is null
      or (p.created_at, p.id) < (p_cursor_created_at, p_cursor_id)
    )
    order by p.created_at desc nulls last, p.id desc
    limit least(greatest(coalesce(p_limit, 1), 1), 200)
  ),
  page_rows as (
    select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at desc, f.id desc), '[]'::jsonb) as rows
    from filtered f
  ),
  last_row as (
    select f.created_at, f.id from filtered f
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

commit;
