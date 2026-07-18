-- Inventory receiving: DDT ricezione merce (v1)

begin;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.inventory_document_status as enum (
    'UPLOADED',
    'ANALYZING',
    'REVIEW_REQUIRED',
    'READY_TO_APPLY',
    'APPLIED',
    'PARTIALLY_APPLIED',
    'FAILED'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.inventory_line_match_status as enum (
    'FOUND',
    'SUGGESTED',
    'NEW_ITEM',
    'REJECTED'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.inventory_line_apply_status as enum (
    'pending',
    'applied',
    'skipped',
    'failed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.inventory_match_method as enum (
    'CODE',
    'SUPPLIER_CODE',
    'DESCRIPTION_AI',
    'MANUAL'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- import_files: kind ddt_receiving
-- ---------------------------------------------------------------------------

alter table public.import_files drop constraint if exists import_files_kind_chk;

alter table public.import_files add constraint import_files_kind_chk check (
  kind in ('ordine_fornitore', 'listino', 'magazzino', 'ai_input', 'ddt_receiving')
);

-- ---------------------------------------------------------------------------
-- inventory_documents
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  supplier_label text,
  purchase_order_id uuid references public.ordini_fornitori (id) on delete set null,
  document_type text not null default 'DDT',
  import_file_id uuid references public.import_files (id) on delete set null,
  file_path text,
  document_number text,
  document_date date,
  content_hash text,
  document_ai_confidence numeric(5, 4),
  status public.inventory_document_status not null default 'UPLOADED',
  applied_at timestamptz,
  applied_by uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_documents_confidence_range check (
    document_ai_confidence is null or (document_ai_confidence >= 0 and document_ai_confidence <= 1)
  ),
  constraint inventory_documents_document_type_chk check (
    document_type in ('DDT', 'FATTURA', 'BOLLA_INTERNA', 'RESO', 'INVENTARIO')
  )
);

create index if not exists idx_inventory_documents_company_status
  on public.inventory_documents (company_id, status, created_at desc);

create index if not exists idx_inventory_documents_content_hash
  on public.inventory_documents (company_id, content_hash)
  where content_hash is not null and status <> 'FAILED';

create unique index if not exists uq_inventory_documents_semantic
  on public.inventory_documents (company_id, lower(coalesce(supplier_label, '')), lower(coalesce(document_number, '')), document_date)
  where status not in ('FAILED') and document_number is not null and document_date is not null;

drop trigger if exists trg_inventory_documents_updated_at on public.inventory_documents;
create trigger trg_inventory_documents_updated_at
before update on public.inventory_documents
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- inventory_document_lines
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_document_lines (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.inventory_documents (id) on delete cascade,
  line_index integer not null,
  raw_code text,
  extracted_description text not null default '',
  extracted_quantity numeric(14, 3) not null default 1,
  received_quantity numeric(14, 3) not null default 1,
  unit text,
  matched_item_id uuid references public.magazzino_ricambi (id) on delete set null,
  match_confidence numeric(5, 4),
  match_status public.inventory_line_match_status not null default 'NEW_ITEM',
  apply_status public.inventory_line_apply_status not null default 'pending',
  user_action text,
  final_quantity numeric(14, 3),
  final_item_id uuid references public.magazzino_ricambi (id) on delete set null,
  line_ai_confidence numeric(5, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_document_lines_user_action_chk check (
    user_action is null or user_action in ('add', 'create', 'skip')
  ),
  constraint inventory_document_lines_qty_pos check (
    extracted_quantity >= 0 and received_quantity >= 0
  ),
  unique (document_id, line_index)
);

create index if not exists idx_inventory_document_lines_document
  on public.inventory_document_lines (document_id, line_index);

drop trigger if exists trg_inventory_document_lines_updated_at on public.inventory_document_lines;
create trigger trg_inventory_document_lines_updated_at
before update on public.inventory_document_lines
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- inventory_item_matches (storico decisioni)
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_item_matches (
  id uuid primary key default gen_random_uuid(),
  document_line_id uuid not null references public.inventory_document_lines (id) on delete cascade,
  inventory_item_id uuid references public.magazzino_ricambi (id) on delete set null,
  confidence numeric(5, 4),
  method public.inventory_match_method not null,
  confirmed_by uuid references public.profiles (id) on delete set null,
  confirmed_at timestamptz not null default now()
);

create index if not exists idx_inventory_item_matches_line
  on public.inventory_item_matches (document_line_id, confirmed_at desc);

-- ---------------------------------------------------------------------------
-- movimenti_ricambi: FK ricezione
-- ---------------------------------------------------------------------------

alter table public.movimenti_ricambi
  add column if not exists inventory_document_id uuid references public.inventory_documents (id) on delete set null;

alter table public.movimenti_ricambi
  add column if not exists inventory_document_line_id uuid references public.inventory_document_lines (id) on delete set null;

create index if not exists idx_movimenti_ricambi_inventory_document
  on public.movimenti_ricambi (inventory_document_id)
  where inventory_document_id is not null;

-- ---------------------------------------------------------------------------
-- RBAC module magazzino_carichi (page SSOT)
-- ---------------------------------------------------------------------------

create or replace function public.rbac_is_valid_erp_module(p_module text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_module, '') in (
    'magazzino', 'magazzino_carichi', 'preventivi', 'lavorazioni', 'mezzi', 'report',
    'documenti', 'dipendenti', 'fatturazione', 'ddt', 'ordini_fornitori', 'document_capture'
  );
$$;

insert into public.rbac_page_module_expansion (page_key, module)
values ('magazzino_carichi', 'magazzino_carichi')
on conflict do nothing;

insert into public.role_page_access (role_id, page_key, access_level)
select r.id, v.page_key, v.access_level
from public.roles r
cross join (
  values
    ('admin', 'magazzino_carichi', 'write'),
    ('manager', 'magazzino_carichi', 'write'),
    ('operatore', 'magazzino_carichi', 'write'),
    ('addetto_amministrativo', 'magazzino_carichi', 'none'),
    ('guest', 'magazzino_carichi', 'read'),
    ('cliente', 'magazzino_carichi', 'none')
) as v(role_key, page_key, access_level)
where r.key = v.role_key and r.is_active
on conflict (role_id, page_key) do update
  set access_level = excluded.access_level,
      updated_at = now();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.inventory_documents enable row level security;
alter table public.inventory_document_lines enable row level security;
alter table public.inventory_item_matches enable row level security;

drop policy if exists inventory_documents_select on public.inventory_documents;
create policy inventory_documents_select on public.inventory_documents for select to authenticated
using (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('magazzino_carichi', 'read')
);

drop policy if exists inventory_documents_insert on public.inventory_documents;
create policy inventory_documents_insert on public.inventory_documents for insert to authenticated
with check (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('magazzino_carichi', 'write')
);

drop policy if exists inventory_documents_update on public.inventory_documents;
create policy inventory_documents_update on public.inventory_documents for update to authenticated
using (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('magazzino_carichi', 'write')
);

drop policy if exists inventory_document_lines_select on public.inventory_document_lines;
create policy inventory_document_lines_select on public.inventory_document_lines for select to authenticated
using (
  exists (
    select 1 from public.inventory_documents d
    where d.id = document_id
      and d.company_id = public.rbac_user_company_id()
      and public.rbac_module_can('magazzino_carichi', 'read')
  )
);

drop policy if exists inventory_document_lines_insert on public.inventory_document_lines;
create policy inventory_document_lines_insert on public.inventory_document_lines for insert to authenticated
with check (
  exists (
    select 1 from public.inventory_documents d
    where d.id = document_id
      and d.company_id = public.rbac_user_company_id()
      and public.rbac_module_can('magazzino_carichi', 'write')
  )
);

drop policy if exists inventory_document_lines_update on public.inventory_document_lines;
create policy inventory_document_lines_update on public.inventory_document_lines for update to authenticated
using (
  exists (
    select 1 from public.inventory_documents d
    where d.id = document_id
      and d.company_id = public.rbac_user_company_id()
      and public.rbac_module_can('magazzino_carichi', 'write')
  )
);

drop policy if exists inventory_item_matches_select on public.inventory_item_matches;
create policy inventory_item_matches_select on public.inventory_item_matches for select to authenticated
using (
  exists (
    select 1
    from public.inventory_document_lines l
    join public.inventory_documents d on d.id = l.document_id
    where l.id = document_line_id
      and d.company_id = public.rbac_user_company_id()
      and public.rbac_module_can('magazzino_carichi', 'read')
  )
);

drop policy if exists inventory_item_matches_insert on public.inventory_item_matches;
create policy inventory_item_matches_insert on public.inventory_item_matches for insert to authenticated
with check (
  exists (
    select 1
    from public.inventory_document_lines l
    join public.inventory_documents d on d.id = l.document_id
    where l.id = document_line_id
      and d.company_id = public.rbac_user_company_id()
      and public.rbac_module_can('magazzino_carichi', 'write')
  )
);

-- ---------------------------------------------------------------------------
-- RPC inventory_receiving_apply
-- ---------------------------------------------------------------------------

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
begin
  if p_user_id is null then raise exception 'Non autenticato'; end if;
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
      insert into public.magazzino_ricambi (codice, nome, marca, quantita, costo, prezzo_vendita, meta, entity_key)
      values (
        trim(v_new_item->>'codice'),
        coalesce(nullif(trim(v_new_item->>'nome'), ''), trim(v_new_item->>'codice')),
        nullif(trim(v_new_item->>'marca'), ''),
        0,
        coalesce((v_new_item->>'costo')::numeric, 0),
        null,
        coalesce(v_new_item->'meta', '{}'::jsonb),
        lower(trim(v_new_item->>'codice'))
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
        updated_at = now()
    where id = v_item_id;

    insert into public.movimenti_ricambi (
      ricambio_id, tipo, quantita, note, created_by,
      inventory_document_id, inventory_document_line_id, conta_statistiche
    ) values (
      v_item_id, 'entrata', v_qty, v_note, p_user_id,
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
      p_user_id
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
      applied_by = case when v_pending = 0 then p_user_id else applied_by end,
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

revoke all on function public.inventory_receiving_apply(uuid, jsonb, uuid) from public;
grant execute on function public.inventory_receiving_apply(uuid, jsonb, uuid) to authenticated;

commit;
