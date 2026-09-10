-- FASE 10 — FatturaPA engine: schema version 1.3.1 baseline, deprecate 1.2.2.
begin;

insert into public.invoice_xml_schema_versions (
  schema_version, specification_version, namespace, root_format, xsd_path, active_from, active_to
)
values
  (
    'FPR12-1.3.1', '1.3.1',
    'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2',
    'FPR12',
    'lib/accounting/einvoice/schemas/faturapa/1.3.1/VFPR12-root.xsd',
    '2024-01-01'::date,
    null
  ),
  (
    'FPA12-1.3.1', '1.3.1',
    'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2',
    'FPA12',
    'lib/accounting/einvoice/schemas/faturapa/1.3.1/VFPA12-root.xsd',
    '2024-01-01'::date,
    null
  )
on conflict (schema_version) do update set
  specification_version = excluded.specification_version,
  xsd_path = excluded.xsd_path,
  active_to = null;

update public.invoice_xml_schema_versions
set active_to = '2025-03-31'::date
where schema_version = 'FPR12-v1.2.2' and active_to is null;

commit;

notify pgrst, 'reload schema';
