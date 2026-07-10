# Import/Export — Guida operativa

Riferimento per utenti e amministratori. Architettura tecnica: [data-import-erp.md](./data-import-erp.md). Gate produzione: [import-export-production-gate.md](./import-export-production-gate.md).

## Modalità export

| Modalità | Contenuto | Uso |
|----------|-----------|-----|
| **Template** | Intestazioni, istruzioni, esempio — zero righe dati | Onboarding, compilazione manuale |
| **Importable** | Campi scrivibili + token concorrenza | Re-import modifiche |
| **Backup** | Record completo (inclusi campi audit) | Archivio — **non importabile** come file standard |

I file backup contengono foglio `_meta` con `ExportMode=backup`. Il sistema rifiuta l'import con errore `BACKUP_NOT_IMPORTABLE`.

## Matrice funzionalità (Production Certified v1)

| Funzione | Stato |
|----------|-------|
| Template export | PROD |
| Import Excel Mezzi | PROD |
| Import Excel Magazzino | PROD |
| Import Excel Preventivi | PROD |
| Export Lavorazioni | PROD |
| Import Lavorazioni Excel | ROADMAP |
| Export Fatture | PROD |
| Import Fatture Excel | ROADMAP |
| Export Ordini | PROD |
| Import Ordini Excel | ROADMAP |
| Import Ordini AI (modal) | PROD |
| Recovery CREATE_ONLY | PROD (Mezzi, Magazzino) |
| FULL rollback | ROADMAP |

## Recovery

- Disponibile solo per import che hanno **creato** record (non update).
- Entità supportate: **Mezzi**, **Magazzino ricambi**.
- Annulla gli insert del batch tramite tabella `import_batch_entities`.
- Non disponibile durante batch `running`.
- Secondo recover su batch già `cancelled` → 0 record rimossi.

## Errori comuni

| Codice / messaggio | Significato |
|--------------------|-------------|
| `BACKUP_NOT_IMPORTABLE` | File export backup usato per import — usare Importable |
| `TEMPLATE_MAJOR_INCOMPATIBLE` | Template Excel troppo vecchio |
| Import già eseguito (409) | Stesso file già importato — fingerprint duplicata |
| Import in preparazione (501) | Modulo export-only (Lavorazioni, Fatture, Ordini Excel) |

## Rollback operativo

Vedi [import-export-production-gate.md](./import-export-production-gate.md) — soglie duplicate/failure rate e azioni raccomandate.

## Stress test (staging)

```bash
npx tsx scripts/import-export-stress.ts
```

Report warning-only — non blocca il rilascio.
