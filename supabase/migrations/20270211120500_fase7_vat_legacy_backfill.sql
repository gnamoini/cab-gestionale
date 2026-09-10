-- FASE 7 — Backfill vat_code_id from iva_percent where HIGH confidence (IVA22/10/4).
begin;

update public.invoice_rows r
set vat_code_id = vc.id
from public.invoices i
join public.vat_codes vc on vc.company_id = i.company_id
where r.invoice_id = i.id
  and r.vat_code_id is null
  and (
    (r.iva_percent = 22 and vc.code = 'IVA22')
    or (r.iva_percent = 10 and vc.code = 'IVA10')
    or (r.iva_percent = 4 and vc.code = 'IVA4')
  );

commit;
