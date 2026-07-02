-- Document Capture: GRANTs + child table RLS write policies

begin;

revoke all on public.companies from public, anon;
revoke all on public.document_capture from public, anon;
revoke all on public.document_capture_events from public, anon;
revoke all on public.document_capture_attempts from public, anon;
revoke all on public.document_capture_fields from public, anon;
revoke all on public.document_capture_applications from public, anon;
revoke all on public.scheda_pdf_templates from public, anon;
revoke all on public.scheda_pdf_generations from public, anon;

grant select on public.companies to authenticated;
grant select, insert, update on public.document_capture to authenticated;
grant select, insert on public.document_capture_events to authenticated;
grant select, insert, update on public.document_capture_attempts to authenticated;
grant select, insert, update on public.document_capture_fields to authenticated;
grant select, insert, update on public.document_capture_applications to authenticated;
grant select on public.scheda_pdf_templates to authenticated;
grant select, insert on public.scheda_pdf_generations to authenticated;

-- attempts INSERT
drop policy if exists cap_document_capture_attempts_insert on public.document_capture_attempts;
create policy cap_document_capture_attempts_insert on public.document_capture_attempts for insert to authenticated
with check (
  company_id = public.rbac_user_company_id()
  and public.rbac_user_company_id() is not null
  and public.rbac_module_can('document_capture', 'write')
  and exists (
    select 1 from public.document_capture dc
    where dc.id = document_capture_attempts.document_capture_id
      and dc.company_id = document_capture_attempts.company_id
      and dc.deleted_at is null
  )
);

-- fields INSERT/UPDATE
drop policy if exists cap_document_capture_fields_insert on public.document_capture_fields;
create policy cap_document_capture_fields_insert on public.document_capture_fields for insert to authenticated
with check (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('document_capture', 'write')
  and exists (
    select 1 from public.document_capture dc
    where dc.id = document_capture_fields.document_capture_id
      and dc.company_id = document_capture_fields.company_id
      and dc.deleted_at is null
  )
);

drop policy if exists cap_document_capture_fields_update on public.document_capture_fields;
create policy cap_document_capture_fields_update on public.document_capture_fields for update to authenticated
using (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('document_capture', 'write')
)
with check (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('document_capture', 'write')
);

-- applications INSERT/UPDATE
drop policy if exists cap_document_capture_applications_insert on public.document_capture_applications;
create policy cap_document_capture_applications_insert on public.document_capture_applications for insert to authenticated
with check (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('document_capture', 'write')
  and exists (
    select 1 from public.document_capture dc
    where dc.id = document_capture_applications.document_capture_id
      and dc.company_id = document_capture_applications.company_id
      and dc.deleted_at is null
  )
);

drop policy if exists cap_document_capture_applications_update on public.document_capture_applications;
create policy cap_document_capture_applications_update on public.document_capture_applications for update to authenticated
using (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('document_capture', 'write')
)
with check (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('document_capture', 'write')
);

commit;
