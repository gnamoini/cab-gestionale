-- Archivio portale clienti: separato dallo stato lavorazione (azione esplicita "Archivia").

alter table public.lavorazioni
  add column if not exists archived boolean not null default false;

alter table public.lavorazioni
  add column if not exists archived_at timestamptz;

create index if not exists idx_lavorazioni_client_portal_archived
  on public.lavorazioni (archived, archived_at desc nulls last);

comment on column public.lavorazioni.archived is
  'Portale clienti: true dopo azione esplicita Archivia (indipendente dallo stato).';
comment on column public.lavorazioni.archived_at is
  'Portale clienti: timestamp archiviazione manuale.';

-- Archivia lavorazione completata (portale clienti / utenti con scope lettura riga).
create or replace function public.archive_lavorazione_client_portal(p_lavorazione_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stato text;
  v_archived boolean;
begin
  if p_lavorazione_id is null then
    raise exception 'Lavorazione non valida';
  end if;

  if not public.rbac_can_read_row('lavorazioni', p_lavorazione_id) then
    raise exception 'Accesso negato';
  end if;

  select l.stato, l.archived
  into v_stato, v_archived
  from public.lavorazioni l
  where l.id = p_lavorazione_id;

  if not found then
    raise exception 'Lavorazione non trovata';
  end if;

  if v_archived then
    raise exception 'Lavorazione già archiviata';
  end if;

  if v_stato is distinct from 'completata' then
    raise exception 'Solo le lavorazioni completate possono essere archiviate';
  end if;

  update public.lavorazioni
  set archived = true,
      archived_at = now()
  where id = p_lavorazione_id;
end;
$$;

revoke all on function public.archive_lavorazione_client_portal(uuid) from public;
grant execute on function public.archive_lavorazione_client_portal(uuid) to authenticated;
