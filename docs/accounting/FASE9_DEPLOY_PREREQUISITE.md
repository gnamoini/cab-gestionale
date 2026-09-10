# FASE 9 — Prerequisito deploy FASE 5–8

Prima di applicare le migration FASE 9, verificare che siano deployate:

| Migration | Fase |
|---|---|
| `20270112120400_billing_customers_migration.sql` | FASE 5 |
| `20270210120000_fase6_document_numbering_engine.sql` | FASE 6 |
| `20270211120000_fase7_vat_engine_schema.sql` | FASE 7 |
| `20270211120100_fase7_vat_engine_rpc.sql` | FASE 7 |
| `20270211120300_fase7_invoice_vat_integration.sql` | FASE 7 |
| `20270212120000_fase8_fatturazione_ciclo_attivo_schema.sql` | FASE 8 |
| `20270212120100_fase8_fatturazione_ciclo_attivo_rpc.sql` | FASE 8 |

## Verifica

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'invoices' AND column_name = 'fiscal_validity';

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'invoice_sdi_jobs'
);
```

Entrambe devono restituire risultati positivi prima di `20270310120000_fase9_invoice_engine_schema.sql`.
