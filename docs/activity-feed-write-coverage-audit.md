# Activity feed — Write coverage audit

SSOT operativa per le card Dashboard **Attività recenti** e per i log UI delle pagine: `public.log_modifiche` via `writeModificaLog()`.

## Decisione trigger DB

La migration `20260211120000_officina_gestionale_core.sql` annota trigger futuri su INSERT/UPDATE/DELETE.
**Non implementati.** Audit intenzionalmente **application-layer** per payload ricchi (diff, context, batching magazzino).
**Non** aggiungere trigger duplicati su `log_modifiche`.

## Store paralleli (non SSOT feed Dashboard)

| Store | Dashboard activity |
|-------|-------------------|
| `log_modifiche` | **Sì** |
| `auth_logs` | No |
| `app_settings_audit` | No |
| localStorage change-log | No |
| `document_capture_events` | No |

## Matrice per-pagina (scope confermato)

| Pagina / modulo | Log UI | Path write | `writeModificaLog` | Stato |
|-----------------|--------|------------|-------------------|-------|
| Lavorazioni | Sì | `lavorazioni.service.ts` | Sì | OK |
| Magazzino | Sì | `magazzino.service.ts`, `movimenti.service.ts` | Sì + `commitCriticalMutation` | OK |
| Mezzi | Sì | `mezzi.service.ts` | Sì | OK |
| Preventivi | Sì | `preventivi.service.ts` | Sì | OK |
| Fatturazione | Sì | `invoices.service.ts` | Sì | OK |
| DDT | Sì (feed + modulo) | `ddt.service.ts` | Sì | OK |
| Documenti | Sì | `documenti.service.ts` | Sì | OK |
| Ordini fornitori | Sì | `ordini-fornitori.service.ts` | Sì | OK |
| Capture → scheda | Sì (lavorazione) | `capture-intervento-write-deps.server.ts` | Sì | OK |
| Import magazzino/preventivi/listino | Sì (summary) | import server paths | Sì | OK |
| Security | Sì | direct insert + `writeSecurityAuditLog` | Parallelo (`entita: security`) | Documentato |
| Clienti anagrafica | No | — | Out of scope | — |
| Promemoria / diary | No | — | Out of scope | — |

## Gap chiusi in questa release

| Operazione | Path | Log |
|------------|------|-----|
| Nota credito | `invoices.service.ts` `createCreditNote` | CREATE `invoices` |
| Pagamento multi-cliente | `registerCustomerPaymentMulti` | CREATE `invoice_payments` + UPDATE `invoices` |
| DDT replace annulla vecchio | `ddt.service.ts` `createOrReplaceForPreventivo` | UPDATE `ddt_documents` |
| Capture scheda UPDATE | `capture-intervento-write-deps.server.ts` | UPDATE `scheda_lavorazione` |
| Rinomina impostazioni → schede | `settings-rename-propagation.service.ts` | UPDATE per riga |
| Import listino | `listino-import-execute.server.ts` | summary CREATE |
| Import preventivi | `preventivi-import.plugin.server.ts` | summary CREATE |
| Import magazzino | `magazzino-import-execute.server.ts` | summary CREATE |
| Scritture silenziose | `audit-log.ts` | `AuditLogWriteError` + throw |
| Batch magazzino flush | `magazzino/movimenti.service.ts` | `commitCriticalMutation` |

## Feed builder

`buildControlTowerActivityFeedSlice` raggruppa per **burst temporale** (`LOG_AGGREGATION_WINDOW_MS` = 5 minuti), non per intera storia entità.

## RBAC log insert

`rbac_log_entita_module` consolidato in migration `20260718120000_rbac_log_entita_module_ssot.sql`. Non ridefinire nelle migration modulo.
