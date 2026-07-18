-- SSOT: rbac_log_entita_module — unica definizione consolidata.
-- Non ridefinire in migration modulo; aggiornare solo questo file.

create or replace function public.rbac_log_entita_module(p_entita text)
returns text
language sql
immutable
set search_path = public
as $$
  select case coalesce(p_entita, '')
    when 'mezzi' then 'mezzi'
    when 'attrezzature' then 'mezzi'
    when 'lavorazioni' then 'lavorazioni'
    when 'scheda_lavorazione' then 'lavorazioni'
    when 'magazzino' then 'magazzino'
    when 'magazzino_ricambi' then 'magazzino'
    when 'movimenti_ricambi' then 'magazzino'
    when 'preventivi' then 'preventivi'
    when 'documenti' then 'documenti'
    when 'dipendenti' then 'dipendenti'
    when 'billing_customers' then 'fatturazione'
    when 'invoices' then 'fatturazione'
    when 'invoice_payments' then 'fatturazione'
    when 'ddt_documents' then 'ddt'
    when 'ordini_fornitori' then 'ordini_fornitori'
    when 'document_capture' then 'document_capture'
    else null
  end;
$$;

comment on function public.rbac_log_entita_module(text) is
  'SSOT: mappa entita log_modifiche → modulo RBAC per policy INSERT. Aggiornare solo via migration rbac_log_entita_module_ssot.';
