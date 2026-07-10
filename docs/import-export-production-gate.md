# Import/Export — Production Gate Contract

Contratto formale per dichiarare **Production Certified v1**. Nessun rilascio generale senza gate verificati.

## Production Certified v1 — scope

### Certified

- Export tutte le entity supportate (toolbar + impostazioni)
- Import Excel: **Mezzi**, **Magazzino ricambi**, **Preventivi**
- Recovery **CREATE_ONLY** (tabella `import_batch_entities`)
- Backup protection (triple guard + `manifestHash` audit)
- Audit business / operational / telemetry
- Idempotency fingerprint (DB unique index granulare)
- Capability SSOT + `assertCapabilityConsistency()`

### Not certified (ROADMAP)

- FULL recovery (event sourcing)
- Excel import Lavorazioni / Fatture / Ordini
- Tuning performance >10k righe
- Blocco hard su `manifestHash` mismatch (v1: warning only)

---

## Exit gates

| Gate | Blocking | Verifica |
|------|----------|----------|
| Capability SSOT + `assertCapabilityConsistency` | YES | `import-capabilities-sync.test.ts` |
| `importWriteMode` allineato a plugin | YES | capabilities-sync |
| Backup guard (parse / preview / execute) | YES | `backup-import-guard.test.ts` |
| Migration compatibility schema v3 + PRG | YES | `import-export-migration-gate.test.ts` |
| Template compatibility in preview | YES | `template-compatibility.test.ts` |
| Fingerprint duplicate + race | YES | `import-export-prg/concurrency.test.ts` |
| Recovery CREATE_ONLY + `import_batch_entities` | YES | `import-export-prg/recovery.test.ts` |
| Audit schema invariants | YES | `audit-schema-contract.test.ts` |
| Round-trip active entities | YES | `IMPORT_PRG_INTEGRATION=1` staging |
| Stress volume + dirty-data | NO (warning) | `scripts/import-export-stress.ts` |
| Observability VIEW | YES | migration + doc |
| Docs operativa + matrice PROD/ROADMAP | YES | review |

---

## Automatic rollback triggers (ops runbook)

| Evento | Azione raccomandata |
|--------|---------------------|
| Duplicate import rate > 5% batch/giorno per entity | Investigare; valutare disable import (feature flag backlog) |
| Batch failure rate > 10% su 24h per entity | Alert; disable import entity |
| Export timeout > SLA | Forzare export async (`export_jobs`) |
| Audit write failure su execute | **Block execute** (fail-closed) |
| Telemetry insert failure | Log warning; non bloccare operazione |

Implementazione v1: documentazione + osservabilità; feature flag automatico in backlog.

---

## Sign-off

| Campo | Valore |
|-------|--------|
| Versione gate | PRG v1.2 |
| Ambiente | staging / production |
| Data | |
| Responsabile | |
| CI offline | pass |
| Integration staging | pass / N/A |
| Stress report | allegato / N/A |

Firma implicita: merge PR con checklist gate completa.
