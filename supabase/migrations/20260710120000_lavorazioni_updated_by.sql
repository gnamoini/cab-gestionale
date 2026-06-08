-- Autore ultima modifica riga lavorazione (deterministico, indipendente da log_modifiche retention).

begin;

alter table public.lavorazioni
  add column if not exists updated_by uuid references public.profiles (id) on delete set null;

create index if not exists idx_lavorazioni_updated_by on public.lavorazioni (updated_by);

comment on column public.lavorazioni.updated_by is
  'Profilo che ha effettuato l''ultima modifica sulla riga lavorazione (stato, priorità, note, …).';

-- Backfill da log sopravvissuti (retention 100 per entita).
update public.lavorazioni l
set updated_by = sub.autore_id
from (
  select distinct on (entita_id) entita_id, autore_id
  from public.log_modifiche
  where entita = 'lavorazioni'
    and autore_id is not null
  order by entita_id, created_at desc
) sub
where l.id = sub.entita_id
  and l.updated_by is null;

-- Fallback creazione (record mai modificati o log purgati).
update public.lavorazioni
set updated_by = created_by
where updated_by is null
  and created_by is not null;

-- Soft delete: traccia autore sulla riga.
create or replace function public.soft_delete_lavorazione(p_lavorazione_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_lavorazione_id is null then
    raise exception 'Lavorazione non valida';
  end if;

  if not public.rbac_can_delete('lavorazioni') then
    raise exception 'Permesso negato';
  end if;

  update public.lavorazioni
  set deleted_at = now(),
      updated_at = now(),
      updated_by = public.rbac_auth_uid()
  where id = p_lavorazione_id
    and deleted_at is null;

  if not found then
    raise exception 'Lavorazione non trovata o già eliminata';
  end if;
end;
$$;

-- Archivio portale clienti: traccia autore sulla riga (updated_at via trigger).
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
      archived_at = now(),
      updated_by = public.rbac_auth_uid()
  where id = p_lavorazione_id;
end;
$$;

commit;
