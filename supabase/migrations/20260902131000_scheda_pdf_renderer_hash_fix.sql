-- Fix scheda_pdf_templates renderer_hash to real SHA256 values

begin;

update public.scheda_pdf_templates
set renderer_hash = '9f89c6fcf339f394d9119fc7356fc683ac4d6360264f666d966292a922b2fe11'
where company_id = '00000000-0000-4000-8000-000000000001'::uuid and tipo = 'ingresso' and version = '1';

update public.scheda_pdf_templates
set renderer_hash = '6812c3bbef36a53399c60309ea6887a76b91b29d350f336e875b89596816af35'
where company_id = '00000000-0000-4000-8000-000000000001'::uuid and tipo = 'lavorazioni' and version = '1';

update public.scheda_pdf_templates
set renderer_hash = 'b125bf689dfed0f8bc7fa7649b8f366253545f710da93ce79b31e91207b07ad2'
where company_id = '00000000-0000-4000-8000-000000000001'::uuid and tipo = 'ricambi' and version = '1';

commit;
