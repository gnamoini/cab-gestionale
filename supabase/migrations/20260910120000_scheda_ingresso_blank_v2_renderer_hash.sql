-- Scheda ingresso blank template v2.0.0 (layout CAB)

begin;

update public.scheda_pdf_templates
set renderer_hash = '1308acb7d290bb22658a230e676e4471b9e118f08ca78b1aaf2dab69f5a1d2e1'
where tipo = 'ingresso' and version = '1';

commit;
