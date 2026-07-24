-- Ore consuntive denormalizzate su lavorazioni (SSOT lettura analytics).
-- Scrittura primaria: save scheda server-side (source=scheda_save).
-- Trigger safety net: drift detection (source=safety_net_trigger).

create or replace function public.cab_unwrap_scheda_contenuto_doc(contenuto jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when contenuto ? 'doc' and jsonb_typeof(contenuto->'doc') = 'object'
      then contenuto->'doc'
    else contenuto
  end;
$$;

create or replace function public.cab_compute_actual_labor_hours(contenuto jsonb)
returns numeric
language sql
immutable
as $$
  with doc as (
    select public.cab_unwrap_scheda_contenuto_doc(coalesce(contenuto, '{}'::jsonb)) as d
  ),
  righe as (
    select jsonb_array_elements(
      case
        when (select d->>'tipo' from doc) = 'lavorazioni'
          then coalesce((select d->'campi'->'righe' from doc), '[]'::jsonb)
        else '[]'::jsonb
      end
    ) as riga
  ),
  addetti as (
    select jsonb_array_elements(coalesce(riga->'addettiAssegnati', '[]'::jsonb)) as addetto
    from righe
  )
  select coalesce(
    round(
      sum(
        case
          when (addetto->>'oreImpiegate') ~ '^-?\d+(\.\d+)?$'
            then (addetto->>'oreImpiegate')::numeric
          else 0
        end
      )::numeric,
      2
    ),
    0
  )
  from addetti;
$$;

alter table public.lavorazioni
  add column if not exists actual_labor_hours numeric(8, 2) not null default 0
    check (actual_labor_hours >= 0),
  add column if not exists actual_labor_hours_source text
    check (
      actual_labor_hours_source is null
      or actual_labor_hours_source in (
        'scheda_save',
        'backfill',
        'manual_adjustment',
        'migration',
        'safety_net_trigger'
      )
    ),
  add column if not exists actual_labor_hours_updated_at timestamptz;

comment on column public.lavorazioni.actual_labor_hours is
  'Ore consuntive denormalizzate da scheda interventi. Aggiornate dal save scheda; non usare per stime.';

comment on column public.lavorazioni.actual_labor_hours_source is
  'Provenienza ultimo aggiornamento actual_labor_hours (diagnostica drift).';

-- Backfill da schede interventi esistenti
update public.lavorazioni l
set
  actual_labor_hours = public.cab_compute_actual_labor_hours(sl.contenuto),
  actual_labor_hours_source = 'migration',
  actual_labor_hours_updated_at = now()
from public.scheda_lavorazione sl
where sl.lavorazione_id = l.id
  and sl.tipo = 'interventi';

create or replace function public.cab_sync_lavorazione_actual_labor_hours_safety_net()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lavorazione_id uuid;
  v_jsonb_hours numeric;
  v_current numeric;
  v_tipo text;
begin
  if tg_op = 'DELETE' then
    v_lavorazione_id := old.lavorazione_id;
    v_tipo := old.tipo::text;
  else
    v_lavorazione_id := new.lavorazione_id;
    v_tipo := new.tipo::text;
  end if;

  if v_tipo <> 'interventi' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    v_jsonb_hours := 0;
  else
    v_jsonb_hours := public.cab_compute_actual_labor_hours(new.contenuto);
  end if;

  select actual_labor_hours into v_current
  from public.lavorazioni
  where id = v_lavorazione_id;

  if v_current is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if round(v_current::numeric, 2) is distinct from round(v_jsonb_hours::numeric, 2) then
    update public.lavorazioni
    set
      actual_labor_hours = v_jsonb_hours,
      actual_labor_hours_source = 'safety_net_trigger',
      actual_labor_hours_updated_at = now()
    where id = v_lavorazione_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_scheda_lavorazione_actual_hours_safety_net on public.scheda_lavorazione;
create trigger trg_scheda_lavorazione_actual_hours_safety_net
after insert or update or delete on public.scheda_lavorazione
for each row execute function public.cab_sync_lavorazione_actual_labor_hours_safety_net();
