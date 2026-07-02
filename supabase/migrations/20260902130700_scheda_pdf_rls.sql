-- scheda_pdf_generations RLS + seed templates Default company

begin;

drop policy if exists cap_scheda_pdf_generations_select on public.scheda_pdf_generations;
create policy cap_scheda_pdf_generations_select on public.scheda_pdf_generations for select to authenticated
using (
  exists (
    select 1 from public.scheda_pdf_templates t
    where t.id = scheda_pdf_generations.template_id
      and t.company_id = public.rbac_user_company_id()
      and public.rbac_module_can('document_capture', 'read')
  )
);

drop policy if exists cap_scheda_pdf_generations_insert on public.scheda_pdf_generations;
create policy cap_scheda_pdf_generations_insert on public.scheda_pdf_generations for insert to authenticated
with check (
  exists (
    select 1 from public.scheda_pdf_templates t
    where t.id = scheda_pdf_generations.template_id
      and t.company_id = public.rbac_user_company_id()
      and public.rbac_module_can('document_capture', 'write')
  )
);

insert into public.scheda_pdf_templates (
  company_id, tipo, version, layout_key, renderer_hash, published_at
)
values
  ('00000000-0000-4000-8000-000000000001'::uuid, 'ingresso', '1', 'schede-blank-layout', 'seed-ingresso-v1', now()),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'lavorazioni', '1', 'schede-blank-layout', 'seed-lavorazioni-v1', now()),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'ricambi', '1', 'schede-blank-layout', 'seed-ricambi-v1', now())
on conflict (company_id, tipo, version) do nothing;

commit;
