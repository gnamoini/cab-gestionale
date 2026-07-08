-- Scheda lavorazioni blank template CAB (layout revision 2)

begin;

update public.scheda_pdf_templates
set renderer_hash = '2875515f5760bb3817c9b1ae8140e46e5544dec52aa07e860dec9425fc21c7c3'
where tipo = 'lavorazioni' and version = '1';

commit;
