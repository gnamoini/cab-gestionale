-- Magazzino sotto scorta: episodio DB (SSOT) + outbox immutabile al crossing.
-- Sostituisce trg_magazzino_outbox_stock_crossing (enqueue su ogni UPDATE quantità).

begin;

alter table public.magazzino_ricambi
  add column if not exists stock_below_min_active boolean not null default false,
  add column if not exists stock_below_min_episode_id uuid null;

comment on column public.magazzino_ricambi.stock_below_min_active is
  'True mentre il ricambio è in episodio sotto soglia; reset al rientro sopra soglia.';
comment on column public.magazzino_ricambi.stock_below_min_episode_id is
  'UUID episodio generato solo al crossing sufficiente→sotto; null se sopra soglia.';

-- Backfill: ricambi già sotto soglia → episodio attivo senza enqueue outbox.
update public.magazzino_ricambi m
set
  stock_below_min_active = true,
  stock_below_min_episode_id = gen_random_uuid()
where
  greatest(0, coalesce(m.quantita, 0)::int) <
  greatest(0, coalesce(
    case
      when (m.meta->>'scortaMinima') ~ '^-?\d+(\.\d+)?$' then (m.meta->>'scortaMinima')::numeric
      else null
    end,
    0
  )::int)
  and greatest(0, coalesce(
    case
      when (m.meta->>'scortaMinima') ~ '^-?\d+(\.\d+)?$' then (m.meta->>'scortaMinima')::numeric
      else null
    end,
    0
  )::int) > 0
  and not m.stock_below_min_active;

create or replace function public.trg_magazzino_stock_alert_episode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev_qty int;
  v_curr_qty int;
  v_prev_min int;
  v_curr_min int;
  v_was_sufficient boolean;
  v_is_sufficient boolean;
  v_episode_id uuid;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  v_prev_qty := greatest(0, coalesce(old.quantita, 0)::int);
  v_curr_qty := greatest(0, coalesce(new.quantita, 0)::int);

  v_prev_min := greatest(0, coalesce(
    case
      when (old.meta->>'scortaMinima') ~ '^-?\d+(\.\d+)?$' then (old.meta->>'scortaMinima')::numeric
      else null
    end,
    0
  )::int);

  v_curr_min := greatest(0, coalesce(
    case
      when (new.meta->>'scortaMinima') ~ '^-?\d+(\.\d+)?$' then (new.meta->>'scortaMinima')::numeric
      else null
    end,
    0
  )::int);

  v_was_sufficient := v_prev_min <= 0 or v_prev_qty >= v_prev_min;
  v_is_sufficient := v_curr_min <= 0 or v_curr_qty >= v_curr_min;

  if v_was_sufficient and not v_is_sufficient then
    v_episode_id := gen_random_uuid();
    new.stock_below_min_active := true;
    new.stock_below_min_episode_id := v_episode_id;

    perform public.cab_enqueue_notification_outbox(
      'magazzino.below_minimum',
      'magazzino_ricambi',
      new.id,
      'magazzino.below_minimum:magazzino_ricambi:' || new.id::text || ':' || v_episode_id::text,
      null,
      jsonb_build_object(
        'episode_id', v_episode_id,
        'ricambio_id', new.id,
        'codice', coalesce(new.codice, ''),
        'nome', coalesce(new.nome, ''),
        'marca', coalesce(new.marca, ''),
        'quantita', v_curr_qty,
        'scorta_minima', v_curr_min,
        'prev_quantita', v_prev_qty,
        'prev_scorta_minima', v_prev_min,
        'curr_quantita', v_curr_qty,
        'curr_scorta_minima', v_curr_min
      ),
      null
    );
  elsif not v_was_sufficient and v_is_sufficient then
    new.stock_below_min_active := false;
    new.stock_below_min_episode_id := null;
  elsif not v_is_sufficient then
    new.stock_below_min_active := coalesce(old.stock_below_min_active, false);
    new.stock_below_min_episode_id := old.stock_below_min_episode_id;
  else
    new.stock_below_min_active := false;
    new.stock_below_min_episode_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists magazzino_outbox_stock_crossing on public.magazzino_ricambi;
drop function if exists public.trg_magazzino_outbox_stock_crossing();

drop trigger if exists magazzino_stock_alert_episode on public.magazzino_ricambi;
create trigger magazzino_stock_alert_episode
  before update of quantita, meta on public.magazzino_ricambi
  for each row
  execute function public.trg_magazzino_stock_alert_episode();

revoke all on function public.trg_magazzino_stock_alert_episode() from public, anon, authenticated;
grant execute on function public.trg_magazzino_stock_alert_episode() to service_role;

commit;
