-- Toolbar Search v2: normalize_search_text, search_document, rebuild queue, RPC search

begin;

create extension if not exists unaccent with schema extensions;

-- SSOT normalizzazione DB (allineata a normalizeEntityString JS, senza fold c→k)
create or replace function public.normalize_search_text(input text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(extensions.unaccent(trim(
    regexp_replace(coalesce(input, ''), '[.,;:''"!?()\[\]{}\\/|@#$%^&*+=~`<>]', ' ', 'g')
  )))
$$;

-- ---------------------------------------------------------------------------
-- Rebuild queue (refresh differito su relazioni ad alto fan-out)
-- ---------------------------------------------------------------------------

create table if not exists public.search_document_rebuild_queue (
  entity_type text not null,
  entity_id uuid not null,
  enqueued_at timestamptz not null default now(),
  primary key (entity_type, entity_id)
);

create index if not exists idx_search_rebuild_queue_enqueued
  on public.search_document_rebuild_queue (enqueued_at);

create or replace function public.enqueue_search_rebuild(p_entity_type text, p_entity_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.search_document_rebuild_queue (entity_type, entity_id)
  values (p_entity_type, p_entity_id)
  on conflict (entity_type, entity_id) do nothing;
$$;

revoke all on function public.enqueue_search_rebuild(text, uuid) from public;
grant execute on function public.enqueue_search_rebuild(text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Lavorazioni
-- ---------------------------------------------------------------------------

alter table public.lavorazioni
  add column if not exists search_document text not null default '';

alter table public.lavorazioni
  drop column if exists search_vector;

alter table public.lavorazioni
  add column search_vector tsvector
  generated always as (to_tsvector('italian', coalesce(search_document, ''))) stored;

create or replace function public.build_lavorazione_search_document(p_lavorazione_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select public.normalize_search_text(
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
  )
  from public.lavorazioni l
  left join public.mezzi m on m.id = l.mezzo_id
  where l.id = p_lavorazione_id
$$;

create or replace function public.refresh_lavorazione_search_document(p_lavorazione_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.lavorazioni l
  set search_document = coalesce(public.build_lavorazione_search_document(p_lavorazione_id), '')
  where l.id = p_lavorazione_id;
$$;

create or replace function public.trg_lavorazioni_refresh_search_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_lavorazione_search_document(new.id);
  return new;
end;
$$;

drop trigger if exists trg_lavorazioni_search_document on public.lavorazioni;
create trigger trg_lavorazioni_search_document
after insert or update of codice, note, stato, priorita, mezzo_id
on public.lavorazioni
for each row
execute function public.trg_lavorazioni_refresh_search_document();

create or replace function public.trg_scheda_lavorazione_refresh_parent_search()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_lavorazione_search_document(coalesce(new.lavorazione_id, old.lavorazione_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_scheda_lavorazione_search_document on public.scheda_lavorazione;
create trigger trg_scheda_lavorazione_search_document
after insert or update or delete
on public.scheda_lavorazione
for each row
execute function public.trg_scheda_lavorazione_refresh_parent_search();

create or replace function public.trg_mezzi_enqueue_lavorazioni_search_rebuild()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lav_id uuid;
begin
  if tg_op = 'UPDATE' and (
    new.targa is not distinct from old.targa
    and new.numero_scuderia is not distinct from old.numero_scuderia
    and new.telaio_num is not distinct from old.telaio_num
    and new.marca_telaio is not distinct from old.marca_telaio
    and new.modello_telaio is not distinct from old.modello_telaio
    and new.tipo_telaio is not distinct from old.tipo_telaio
    and new.cliente is not distinct from old.cliente
    and new.utilizzatore is not distinct from old.utilizzatore
  ) then
    return new;
  end if;

  for lav_id in
    select l.id from public.lavorazioni l
    where l.mezzo_id = new.id and l.deleted_at is null
  loop
    perform public.enqueue_search_rebuild('lavorazione', lav_id);
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_mezzi_enqueue_lavorazioni_search on public.mezzi;
create trigger trg_mezzi_enqueue_lavorazioni_search
after update of targa, numero_scuderia, telaio_num, marca_telaio, modello_telaio, tipo_telaio, cliente, utilizzatore
on public.mezzi
for each row
execute function public.trg_mezzi_enqueue_lavorazioni_search_rebuild();

-- ---------------------------------------------------------------------------
-- Magazzino
-- ---------------------------------------------------------------------------

alter table public.magazzino_ricambi
  add column if not exists search_document text not null default '';

alter table public.magazzino_ricambi
  drop column if exists search_vector;

alter table public.magazzino_ricambi
  add column search_vector tsvector
  generated always as (to_tsvector('italian', coalesce(search_document, ''))) stored;

create or replace function public.build_magazzino_search_document(p_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select public.normalize_search_text(
    concat_ws(' ',
      r.codice,
      r.nome,
      r.marca,
      r.meta::text
    )
  )
  from public.magazzino_ricambi r
  where r.id = p_id
$$;

create or replace function public.refresh_magazzino_search_document(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.magazzino_ricambi r
  set search_document = coalesce(public.build_magazzino_search_document(p_id), '')
  where r.id = p_id;
$$;

create or replace function public.trg_magazzino_refresh_search_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_magazzino_search_document(new.id);
  return new;
end;
$$;

drop trigger if exists trg_magazzino_search_document on public.magazzino_ricambi;
create trigger trg_magazzino_search_document
after insert or update of codice, nome, marca, meta
on public.magazzino_ricambi
for each row
execute function public.trg_magazzino_refresh_search_document();

-- ---------------------------------------------------------------------------
-- Preventivi
-- ---------------------------------------------------------------------------

alter table public.preventivi
  add column if not exists search_document text not null default '';

alter table public.preventivi
  drop column if exists search_vector;

alter table public.preventivi
  add column search_vector tsvector
  generated always as (to_tsvector('italian', coalesce(search_document, ''))) stored;

create or replace function public.build_preventivo_search_document(p_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select public.normalize_search_text(
    concat_ws(' ',
      p.cliente,
      p.dettagli::text,
      m.targa,
      m.marca_telaio,
      m.modello_telaio,
      m.cliente
    )
  )
  from public.preventivi p
  left join public.mezzi m on m.id = p.mezzo_id
  where p.id = p_id
$$;

create or replace function public.refresh_preventivo_search_document(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.preventivi p
  set search_document = coalesce(public.build_preventivo_search_document(p_id), '')
  where p.id = p_id;
$$;

create or replace function public.trg_preventivi_refresh_search_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_preventivo_search_document(new.id);
  return new;
end;
$$;

drop trigger if exists trg_preventivi_search_document on public.preventivi;
create trigger trg_preventivi_search_document
after insert or update of cliente, dettagli, mezzo_id
on public.preventivi
for each row
execute function public.trg_preventivi_refresh_search_document();

-- ---------------------------------------------------------------------------
-- Mezzi (self search)
-- ---------------------------------------------------------------------------

alter table public.mezzi
  add column if not exists search_document text not null default '';

alter table public.mezzi
  drop column if exists search_vector;

alter table public.mezzi
  add column search_vector tsvector
  generated always as (to_tsvector('italian', coalesce(search_document, ''))) stored;

create or replace function public.build_mezzo_search_document(p_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select public.normalize_search_text(
    concat_ws(' ',
      m.cliente,
      m.utilizzatore,
      m.targa,
      m.numero_scuderia,
      m.marca_telaio,
      m.modello_telaio,
      m.tipo_telaio,
      m.telaio_num
    )
  )
  from public.mezzi m
  where m.id = p_id
$$;

create or replace function public.refresh_mezzo_search_document(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.mezzi m
  set search_document = coalesce(public.build_mezzo_search_document(p_id), '')
  where m.id = p_id;
$$;

create or replace function public.trg_mezzi_refresh_search_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_mezzo_search_document(new.id);
  return new;
end;
$$;

drop trigger if exists trg_mezzi_search_document on public.mezzi;
create trigger trg_mezzi_search_document
after insert or update of cliente, utilizzatore, targa, numero_scuderia, marca_telaio, modello_telaio, tipo_telaio, telaio_num
on public.mezzi
for each row
execute function public.trg_mezzi_refresh_search_document();

-- ---------------------------------------------------------------------------
-- Queue processor
-- ---------------------------------------------------------------------------

create or replace function public.process_search_rebuild_queue(p_batch_size int default 500)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  processed int := 0;
begin
  for rec in
    select entity_type, entity_id
    from public.search_document_rebuild_queue
    order by enqueued_at
    limit greatest(1, least(coalesce(p_batch_size, 500), 2000))
  loop
    if rec.entity_type = 'lavorazione' then
      perform public.refresh_lavorazione_search_document(rec.entity_id);
    elsif rec.entity_type = 'magazzino' then
      perform public.refresh_magazzino_search_document(rec.entity_id);
    elsif rec.entity_type = 'preventivo' then
      perform public.refresh_preventivo_search_document(rec.entity_id);
    elsif rec.entity_type = 'mezzo' then
      perform public.refresh_mezzo_search_document(rec.entity_id);
    end if;
    delete from public.search_document_rebuild_queue q
    where q.entity_type = rec.entity_type and q.entity_id = rec.entity_id;
    processed := processed + 1;
  end loop;
  return processed;
end;
$$;

revoke all on function public.process_search_rebuild_queue(int) from public;
grant execute on function public.process_search_rebuild_queue(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Indici GIN
-- ---------------------------------------------------------------------------

create index if not exists idx_lavorazioni_search_document_trgm
  on public.lavorazioni using gin (search_document gin_trgm_ops);

create index if not exists idx_lavorazioni_search_vector_gin
  on public.lavorazioni using gin (search_vector);

create index if not exists idx_magazzino_search_document_trgm
  on public.magazzino_ricambi using gin (search_document gin_trgm_ops);

create index if not exists idx_magazzino_search_vector_gin
  on public.magazzino_ricambi using gin (search_vector);

create index if not exists idx_preventivi_search_document_trgm
  on public.preventivi using gin (search_document gin_trgm_ops);

create index if not exists idx_preventivi_search_vector_gin
  on public.preventivi using gin (search_vector);

create index if not exists idx_mezzi_search_document_trgm
  on public.mezzi using gin (search_document gin_trgm_ops);

create index if not exists idx_mezzi_search_vector_gin
  on public.mezzi using gin (search_vector);

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------

update public.lavorazioni l
set search_document = coalesce(public.build_lavorazione_search_document(l.id), '')
where l.search_document = '' or l.search_document is null;

update public.magazzino_ricambi r
set search_document = coalesce(public.build_magazzino_search_document(r.id), '')
where r.search_document = '' or r.search_document is null;

update public.preventivi p
set search_document = coalesce(public.build_preventivo_search_document(p.id), '')
where p.search_document = '' or p.search_document is null;

update public.mezzi m
set search_document = coalesce(public.build_mezzo_search_document(m.id), '')
where m.search_document = '' or m.search_document is null;

-- ---------------------------------------------------------------------------
-- RPC: list_lavorazioni_paginated — search su search_document + FTS
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

-- ---------------------------------------------------------------------------
-- RPC: list_magazzino_paginated
-- ---------------------------------------------------------------------------

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
      or r.search_document like '%' || n.q || '%'
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

revoke all on function public.list_magazzino_paginated(int, timestamptz, uuid, text) from public;
grant execute on function public.list_magazzino_paginated(int, timestamptz, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: list_preventivi_paginated
-- ---------------------------------------------------------------------------

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
      or p.search_document like '%' || n.q || '%'
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

revoke all on function public.list_preventivi_paginated(int, timestamptz, uuid, text) from public;
grant execute on function public.list_preventivi_paginated(int, timestamptz, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Ordini fornitori + invoices (search_document)
-- ---------------------------------------------------------------------------

alter table public.ordini_fornitori
  add column if not exists search_document text not null default '';

alter table public.ordini_fornitori
  drop column if exists search_vector;

alter table public.ordini_fornitori
  add column search_vector tsvector
  generated always as (to_tsvector('italian', coalesce(search_document, ''))) stored;

create or replace function public.build_ordine_fornitore_search_document(p_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select public.normalize_search_text(
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
  )
  from public.ordini_fornitori o
  where o.id = p_id
$$;

create or replace function public.refresh_ordine_fornitore_search_document(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ordini_fornitori o
  set search_document = coalesce(public.build_ordine_fornitore_search_document(p_id), '')
  where o.id = p_id;
$$;

create index if not exists idx_ordini_fornitori_search_document_trgm
  on public.ordini_fornitori using gin (search_document gin_trgm_ops);

create index if not exists idx_ordini_fornitori_search_vector_gin
  on public.ordini_fornitori using gin (search_vector);

update public.ordini_fornitori o
set search_document = coalesce(public.build_ordine_fornitore_search_document(o.id), '')
where o.search_document = '' or o.search_document is null;

alter table public.invoices
  add column if not exists search_document text not null default '';

alter table public.invoices
  drop column if exists search_vector;

alter table public.invoices
  add column search_vector tsvector
  generated always as (to_tsvector('italian', coalesce(search_document, ''))) stored;

create or replace function public.build_invoice_search_document(p_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select public.normalize_search_text(
    concat_ws(' ',
      i.cliente_label,
      i.numero::text,
      i.anno::text,
      i.note,
      i.status
    )
  )
  from public.invoices i
  where i.id = p_id
$$;

create or replace function public.refresh_invoice_search_document(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.invoices i
  set search_document = coalesce(public.build_invoice_search_document(p_id), '')
  where i.id = p_id;
$$;

create index if not exists idx_invoices_search_document_trgm
  on public.invoices using gin (search_document gin_trgm_ops);

create index if not exists idx_invoices_search_vector_gin
  on public.invoices using gin (search_vector);

update public.invoices i
set search_document = coalesce(public.build_invoice_search_document(i.id), '')
where i.search_document = '' or i.search_document is null;

commit;
