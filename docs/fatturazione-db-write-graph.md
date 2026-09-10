# Fatturazione DB write graph

Generato da regression test. Regola: UPDATE assi solo in `invoice_write_status_axes` (allowlist: `apply_invoice_status_backfill`).

- cancel_invoice → invoice_apply_transition
- apply_sdi_event → invoice_write_status_axes (FASE 9 sole writer sdi_status + fiscal_validity)
- handle_sdi_outcome → apply_sdi_event (legacy delegate)
- handle_sdi_rejected → invoice_write_status_axes
- invoice_apply_transition → invoice_write_status_axes
- invoice_guard_direct_axes_update → invoice_write_status_axes
- invoice_guard_direct_status_update → invoice_apply_transition
- register_invoice_payment → invoice_write_status_axes
