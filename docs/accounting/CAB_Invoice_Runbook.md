# CAB Invoice Runbook (FASE 9)

NS scarto: fiscal_validity=not_validly_issued, Correggi -> same numero, new XML, re-submit.

MC: impossibilita_consegna + validly_issued (NOT rejected).

Reconciliation: transport pending_reconciliation; cron handles poll.

Audit: invoice_sdi_events + invoice_state_history + invoice_xml_documents.
