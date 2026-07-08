-- Scheda ricambi blank template CAB (layout revision 2)

begin;

update public.scheda_pdf_templates
set renderer_hash = '78904233fc300378fc577e7ae01488d4b5f0e59bcaabf7335d68464fd67d559f'
where tipo = 'ricambi' and version = '1';

commit;
