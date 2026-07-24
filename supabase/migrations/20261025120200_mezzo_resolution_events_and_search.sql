-- Mezzo identity: audit runtime risoluzione ident + search matricola attrezzatura

create table if not exists public.mezzo_resolution_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  ident_used jsonb,
  candidate_count int not null default 0,
  resolved_mezzo_id uuid references public.mezzi(id) on delete set null,
  status text not null,
  context jsonb,
  created_by uuid references public.profiles(id) on delete set null
);

comment on table public.mezzo_resolution_events is
  'Audit runtime risoluzione mezzo per ident (import, capture, scheda ingresso). Vedi docs/domain/mezzo-identity-policy.md';

create index if not exists idx_mezzo_resolution_events_created_at
  on public.mezzo_resolution_events (created_at desc);

create index if not exists idx_mezzo_resolution_events_status
  on public.mezzo_resolution_events (status)
  where status in ('ambiguous', 'error');

alter table public.mezzo_resolution_events enable row level security;

drop policy if exists mezzo_resolution_events_insert on public.mezzo_resolution_events;
create policy mezzo_resolution_events_insert on public.mezzo_resolution_events
  for insert to authenticated
  with check (true);

drop policy if exists mezzo_resolution_events_select on public.mezzo_resolution_events;
create policy mezzo_resolution_events_select on public.mezzo_resolution_events
  for select to authenticated
  using (public.rbac_is_admin() or public.rbac_is_operatore());

-- ponytail: VIN (telaio_num_norm) resta l'unica unicità operativa globale su mezzi

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
      m.telaio_num,
      (
        select string_agg(distinct a.matricola, ' ')
        from public.attrezzature a
        where a.mezzo_id = m.id
          and a.matricola is not null
          and trim(a.matricola) <> ''
      )
    )
  )
  from public.mezzi m
  where m.id = p_id
$$;

update public.mezzi m
set search_document = coalesce(public.build_mezzo_search_document(m.id), '')
where true;
