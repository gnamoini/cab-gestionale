-- Author columns (Phase 2): explicit writer policy — no default auth.uid().
-- magazzino_ricambi: created_by / updated_by set by magazzino.service, movimenti.service, inventory_receiving_apply RPC.
-- documenti: created_by set by document upload service on INSERT.

alter table public.magazzino_ricambi
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

comment on column public.magazzino_ricambi.created_by is 'Writer: magazzino.service INSERT; inventory_receiving_apply on create.';
comment on column public.magazzino_ricambi.updated_by is 'Writer: magazzino.service UPDATE; movimenti stock apply; inventory_receiving_apply.';

alter table public.documenti
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

comment on column public.documenti.created_by is 'Writer: documenti upload service on INSERT.';

-- Backfill magazzino updated_by from latest log_modifiche (best effort).
update public.magazzino_ricambi m
set updated_by = sub.autore_id
from (
  select distinct on (entita_id) entita_id, autore_id
  from public.log_modifiche
  where entita in ('magazzino_ricambi', 'movimenti_ricambi')
    and autore_id is not null
  order by entita_id, created_at desc
) sub
where m.id = sub.entita_id::uuid
  and m.updated_by is null;

-- Backfill documenti created_by from meta JSON userId when present (legacy).
update public.documenti d
set created_by = nullif(trim(d.meta->>'autoreCaricamentoUserId'), '')::uuid
where d.created_by is null
  and nullif(trim(d.meta->>'autoreCaricamentoUserId'), '') is not null;

-- inventory_receiving_apply: stamp updated_by / created_by on magazzino when columns exist.
create or replace function public.inventory_receiving_apply(
  p_document_id uuid,
  p_lines jsonb,
  p_user_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
  v_doc record;
  v_line jsonb;
  v_line_id uuid;
  v_action text;
  v_qty numeric;
  v_item_id uuid;
  v_new_item jsonb;
  v_applied int := 0;
  v_skipped int := 0;
  v_failed int := 0;
  v_pending int := 0;
  v_note text;
  v_row record;
  v_actor uuid;
begin
  v_actor := public.rbac_auth_uid();
  if v_actor is null then raise exception 'Non autenticato'; end if;
  if p_user_id is not null and p_user_id is distinct from v_actor then
    raise exception 'p_user_id non consentito' using errcode = '42501';
  end if;

  v_company := public.rbac_user_company_id();
  if v_company is null then raise exception 'Tenant non configurato'; end if;
  if not public.rbac_module_can('magazzino_carichi', 'write') then raise exception 'Permesso negato'; end if;

  select * into v_doc from public.inventory_documents
  where id = p_document_id and company_id = v_company
  for update;

  if not found then raise exception 'Documento non trovato'; end if;
  if v_doc.status = 'APPLIED' then raise exception 'Documento già applicato'; end if;
  if v_doc.status not in ('READY_TO_APPLY', 'PARTIALLY_APPLIED', 'REVIEW_REQUIRED') then
    raise exception 'Stato documento non valido per apply: %', v_doc.status;
  end if;

  v_note := 'Carico DDT ' || coalesce(v_doc.document_number, p_document_id::text);

  for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    v_line_id := (v_line->>'line_id')::uuid;
    v_action := coalesce(v_line->>'action', 'skip');
    v_qty := coalesce((v_line->>'final_quantity')::numeric, 0);
    v_item_id := nullif(v_line->>'final_item_id', '')::uuid;

    select * into v_row from public.inventory_document_lines
    where id = v_line_id and document_id = p_document_id
    for update;

    if not found then
      v_failed := v_failed + 1;
      continue;
    end if;

    if v_row.apply_status = 'applied' then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if v_action = 'skip' or v_qty <= 0 then
      update public.inventory_document_lines
      set apply_status = 'skipped', user_action = 'skip', updated_at = now()
      where id = v_line_id;
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if v_action = 'create' then
      v_new_item := v_line->'new_item';
      if v_new_item is null or coalesce(v_new_item->>'codice', '') = '' then
        update public.inventory_document_lines set apply_status = 'failed', updated_at = now() where id = v_line_id;
        v_failed := v_failed + 1;
        continue;
      end if;
      insert into public.magazzino_ricambi (
        codice, nome, marca, quantita, costo, prezzo_vendita, meta, entity_key, created_by, updated_by
      )
      values (
        trim(v_new_item->>'codice'),
        coalesce(nullif(trim(v_new_item->>'nome'), ''), trim(v_new_item->>'codice')),
        nullif(trim(v_new_item->>'marca'), ''),
        0,
        coalesce((v_new_item->>'costo')::numeric, 0),
        null,
        coalesce(v_new_item->'meta', '{}'::jsonb),
        lower(trim(v_new_item->>'codice')),
        v_actor,
        v_actor
      )
      returning id into v_item_id;
    elsif v_action = 'add' then
      if v_item_id is null then
        v_item_id := v_row.matched_item_id;
      end if;
      if v_item_id is null then
        update public.inventory_document_lines set apply_status = 'failed', updated_at = now() where id = v_line_id;
        v_failed := v_failed + 1;
        continue;
      end if;
    else
      update public.inventory_document_lines set apply_status = 'failed', updated_at = now() where id = v_line_id;
      v_failed := v_failed + 1;
      continue;
    end if;

    update public.magazzino_ricambi
    set quantita = coalesce(quantita, 0) + v_qty,
        updated_at = now(),
        updated_by = v_actor
    where id = v_item_id;

    insert into public.movimenti_ricambi (
      ricambio_id, tipo, quantita, note, created_by,
      inventory_document_id, inventory_document_line_id, conta_statistiche
    ) values (
      v_item_id, 'entrata', v_qty, v_note, v_actor,
      p_document_id, v_line_id, true
    );

    update public.inventory_document_lines
    set apply_status = 'applied',
        user_action = v_action,
        final_quantity = v_qty,
        final_item_id = v_item_id,
        updated_at = now()
    where id = v_line_id;

    insert into public.inventory_item_matches (document_line_id, inventory_item_id, confidence, method, confirmed_by)
    values (
      v_line_id,
      v_item_id,
      coalesce(v_row.match_confidence, 1),
      case when v_action = 'create' then 'MANUAL'::public.inventory_match_method
           when v_row.match_status = 'FOUND' then 'CODE'::public.inventory_match_method
           else 'MANUAL'::public.inventory_match_method end,
      v_actor
    );

    v_applied := v_applied + 1;
  end loop;

  select count(*) into v_pending
  from public.inventory_document_lines
  where document_id = p_document_id and apply_status = 'pending';

  update public.inventory_documents
  set status = case when v_pending > 0 then 'PARTIALLY_APPLIED'::public.inventory_document_status
                    else 'APPLIED'::public.inventory_document_status end,
      applied_at = case when v_pending = 0 then now() else applied_at end,
      applied_by = case when v_pending = 0 then v_actor else applied_by end,
      updated_at = now()
  where id = p_document_id;

  return jsonb_build_object(
    'ok', true,
    'applied', v_applied,
    'skipped', v_skipped,
    'failed', v_failed,
    'pending', v_pending,
    'status', case when v_pending > 0 then 'PARTIALLY_APPLIED' else 'APPLIED' end
  );
end;
$$;
