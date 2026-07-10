-- Import core security: tenant isolation + semantic_key dedup

begin;

-- ---------------------------------------------------------------------------
-- import_batches.company_id
-- ---------------------------------------------------------------------------

alter table public.import_batches
  add column if not exists company_id uuid references public.companies (id) on delete set null;

update public.import_batches b
set company_id = p.company_id
from public.profiles p
where b.created_by = p.id
  and b.company_id is null
  and p.company_id is not null;

create index if not exists idx_import_batches_company_created
  on public.import_batches (company_id, created_at desc)
  where company_id is not null;

drop policy if exists cap_import_batches_select on public.import_batches;
create policy cap_import_batches_select on public.import_batches
for select to authenticated
using (
  (
    company_id is not null
    and company_id = public.rbac_user_company_id()
  )
  or (
    company_id is null
    and created_by = auth.uid()
  )
  or public.rbac_has_capability(auth.uid(), 'can_manage_settings')
);

-- ---------------------------------------------------------------------------
-- ordini_fornitori_import_log.company_id
-- ---------------------------------------------------------------------------

alter table public.ordini_fornitori_import_log
  add column if not exists company_id uuid references public.companies (id) on delete set null;

-- ponytail: ordini_fornitori has no company_id — backfill tenant via created_by profile only.
update public.ordini_fornitori_import_log l
set company_id = p.company_id
from public.profiles p
where l.created_by = p.id
  and l.company_id is null
  and p.company_id is not null;

create index if not exists idx_ordini_fornitori_import_log_company
  on public.ordini_fornitori_import_log (company_id, created_at desc)
  where company_id is not null;

drop policy if exists cap_ordini_fornitori_import_log_select on public.ordini_fornitori_import_log;
create policy cap_ordini_fornitori_import_log_select on public.ordini_fornitori_import_log
for select to authenticated
using (
  public.rbac_module_can('ordini_fornitori', 'read')
  and (
    company_id is null
    or company_id = public.rbac_user_company_id()
  )
);

drop policy if exists cap_ordini_fornitori_import_log_insert on public.ordini_fornitori_import_log;
create policy cap_ordini_fornitori_import_log_insert on public.ordini_fornitori_import_log
for insert to authenticated
with check (
  public.rbac_module_can('ordini_fornitori', 'write')
  and (
    company_id is null
    or company_id = public.rbac_user_company_id()
  )
);

drop policy if exists cap_ordini_fornitori_import_log_update on public.ordini_fornitori_import_log;
create policy cap_ordini_fornitori_import_log_update on public.ordini_fornitori_import_log
for update to authenticated
using (
  public.rbac_module_can('ordini_fornitori', 'write')
  and (
    company_id is null
    or company_id = public.rbac_user_company_id()
  )
)
with check (
  public.rbac_module_can('ordini_fornitori', 'write')
  and (
    company_id is null
    or company_id = public.rbac_user_company_id()
  )
);

-- semantic_key dedup (partial unique when ordine committed)
create unique index if not exists idx_ordini_fornitori_import_log_semantic_key_uq
  on public.ordini_fornitori_import_log (semantic_key)
  where semantic_key is not null and ordine_id is not null;

commit;
