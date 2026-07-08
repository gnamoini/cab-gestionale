-- Import preventivo fornitore: meta ordine, link documento, import log.

begin;

alter table public.ordini_fornitori
  add column if not exists meta jsonb not null default '{}'::jsonb;

alter table public.ordini_fornitori
  drop constraint if exists ordini_fornitori_meta_obj_chk;

alter table public.ordini_fornitori
  add constraint ordini_fornitori_meta_obj_chk
  check (jsonb_typeof(meta) = 'object');

alter table public.ordini_fornitori_links
  drop constraint if exists ordini_fornitori_links_source_type_chk;

alter table public.ordini_fornitori_links
  add constraint ordini_fornitori_links_source_type_chk check (
    source_type in ('lavorazione', 'preventivo', 'scheda', 'magazzino', 'documento')
  );

create table if not exists public.ordini_fornitori_import_log (
  id uuid primary key default gen_random_uuid(),
  ordine_id uuid references public.ordini_fornitori (id) on delete set null,
  documento_id uuid not null references public.documenti (id) on delete restrict,
  content_hash text not null,
  semantic_key text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ordini_fornitori_import_log_content_hash_chk check (char_length(trim(content_hash)) > 0)
);

create unique index if not exists idx_ordini_fornitori_import_log_content_hash_uq
  on public.ordini_fornitori_import_log (content_hash);

create index if not exists idx_ordini_fornitori_import_log_semantic_key
  on public.ordini_fornitori_import_log (semantic_key)
  where semantic_key is not null;

create index if not exists idx_ordini_fornitori_import_log_ordine_id
  on public.ordini_fornitori_import_log (ordine_id);

alter table public.ordini_fornitori_import_log enable row level security;

drop policy if exists cap_ordini_fornitori_import_log_select on public.ordini_fornitori_import_log;
create policy cap_ordini_fornitori_import_log_select on public.ordini_fornitori_import_log
for select to authenticated
using (public.rbac_module_can('ordini_fornitori', 'read'));

drop policy if exists cap_ordini_fornitori_import_log_insert on public.ordini_fornitori_import_log;
create policy cap_ordini_fornitori_import_log_insert on public.ordini_fornitori_import_log
for insert to authenticated
with check (public.rbac_module_can('ordini_fornitori', 'write'));

drop policy if exists cap_ordini_fornitori_import_log_update on public.ordini_fornitori_import_log;
create policy cap_ordini_fornitori_import_log_update on public.ordini_fornitori_import_log
for update to authenticated
using (public.rbac_module_can('ordini_fornitori', 'write'))
with check (public.rbac_module_can('ordini_fornitori', 'write'));

create or replace function public.create_ordine_fornitore_with_righe(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_ordine_id uuid;
  v_row jsonb;
  v_ordine integer := 0;
  v_trasporto numeric;
  v_iva_percent numeric;
  v_tot record;
  v_status text;
  v_row_total numeric;
begin
  if not public.rbac_module_can('ordini_fornitori', 'write') then
    raise exception 'Permesso negato';
  end if;

  if nullif(trim(p_payload->>'fornitore_label'), '') is null then
    raise exception 'Fornitore obbligatorio';
  end if;

  v_status := coalesce(nullif(p_payload->>'status', ''), 'bozza');
  if v_status not in ('bozza', 'inviato', 'confermato', 'spedito', 'ricevuto') then
    raise exception 'Stato ordine iniziale non valido';
  end if;

  v_trasporto := greatest(coalesce((p_payload->>'trasporto')::numeric, 0), 0);
  v_iva_percent := coalesce((p_payload->>'iva_percent')::numeric, 22);

  select * into v_tot
  from public.ordine_fornitore_compute_totals(
    coalesce(p_payload->'righe', '[]'::jsonb),
    v_trasporto,
    v_iva_percent
  );

  insert into public.ordini_fornitori (
    numero, status, data_ordine,
    fornitore_label, fornitore_snapshot,
    destinazione, destinazione_snapshot,
    logistica_snapshot,
    note, imponibile_righe, trasporto, imponibile, iva_percent, iva, totale,
    lavorazione_id, preventivo_id, scheda_lavorazione_id,
    meta,
    created_by, updated_by
  )
  values (
    null,
    v_status,
    coalesce(nullif(p_payload->>'data_ordine', '')::date, current_date),
    trim(p_payload->>'fornitore_label'),
    coalesce(p_payload->'fornitore_snapshot', '{}'::jsonb),
    nullif(p_payload->>'destinazione', ''),
    coalesce(p_payload->'destinazione_snapshot', '{}'::jsonb),
    coalesce(p_payload->'logistica_snapshot', '{}'::jsonb),
    nullif(p_payload->>'note', ''),
    v_tot.imponibile_righe,
    v_trasporto,
    v_tot.imponibile,
    v_iva_percent,
    v_tot.iva,
    v_tot.totale,
    nullif(p_payload->>'lavorazione_id', '')::uuid,
    nullif(p_payload->>'preventivo_id', '')::uuid,
    nullif(p_payload->>'scheda_lavorazione_id', '')::uuid,
    coalesce(p_payload->'meta', '{}'::jsonb),
    v_uid,
    v_uid
  )
  returning id into v_ordine_id;

  for v_row in select * from jsonb_array_elements(coalesce(p_payload->'righe', '[]'::jsonb))
  loop
    v_ordine := v_ordine + 1;
    v_row_total := public.ordine_fornitore_row_total(
      (v_row->>'quantita')::numeric,
      (v_row->>'prezzo_unitario')::numeric,
      coalesce((v_row->>'sconto_percent')::numeric, 0)
    );
    insert into public.ordini_fornitori_righe (
      ordine_id, ordine, ricambio_id, codice, descrizione,
      quantita, prezzo_unitario, sconto_percent, totale_riga, meta
    )
    values (
      v_ordine_id,
      coalesce((v_row->>'ordine')::integer, v_ordine),
      nullif(v_row->>'ricambio_id', '')::uuid,
      nullif(v_row->>'codice', ''),
      coalesce(nullif(trim(v_row->>'descrizione'), ''), 'Articolo'),
      greatest(coalesce((v_row->>'quantita')::numeric, 1), 0.001),
      greatest(coalesce((v_row->>'prezzo_unitario')::numeric, 0), 0),
      least(100, greatest(coalesce((v_row->>'sconto_percent')::numeric, 0), 0)),
      v_row_total,
      coalesce(v_row->'meta', '{}'::jsonb)
    );
  end loop;

  if not exists (select 1 from public.ordini_fornitori_righe where ordine_id = v_ordine_id) then
    raise exception 'L''ordine deve contenere almeno una riga';
  end if;

  return v_ordine_id;
end;
$$;

commit;
