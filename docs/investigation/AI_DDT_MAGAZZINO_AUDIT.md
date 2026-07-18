# Audit: AI Ricezione Ricambi da DDT (Inventory Receiving)

**Data:** 2026-07-18  
**Stato:** Completato — base per implementazione v1  
**Dominio:** `inventory-receiving` (ricezione merce)

---

## 1. Architettura Magazzino attuale

### Schema database

| Tabella | Ruolo |
|---------|-------|
| `magazzino_ricambi` | Anagrafica ricambi: `codice`, `nome`, `marca`, `quantita`, `meta` JSONB |
| `movimenti_ricambi` | Movimenti `entrata` / `uscita`; aggiornano `quantita` |
| `log_modifiche` | Audit trail (`magazzino_ricambi`, `movimenti_ricambi`) |

Non esiste tabella `articoli` né modulo "carichi". Il carico manuale = movimento `entrata` via scorta +/- o `movimentiService.create`.

### Servizi applicativi

- **Client**: `magazzino.service.ts`, `movimenti.service.ts` — CRUD diretto Supabase
- **Entry RBAC**: `magazzino-entry.ts`, `movimenti-entry.ts` — `withPageWriteGuard("magazzino")`
- **Server prefetch**: `magazzino-list-fetch-server.ts`, `bff/magazzino-page-fetch-server.ts`

### Permessi

- Page key: `magazzino` → module `magazzino.read` / `magazzino.write`
- RLS: `rbac_module_can('magazzino', 'read'|'write')` + capabilities operative

### Codici fornitore alternativi

Memorizzati in `meta.fornitoriAlternativi[]` (`RicambioFornitoreAlternativo`: fornitore, codice, prezzo). Matching codice: `lib/magazzino/duplicates.ts` → `findDuplicateByCodici`.

---

## 2. Document Capture / AI — cosa riusare

| Componente | Riuso v1 | Note |
|------------|----------|------|
| `aiService.generateObject` | Sì | SSOT Gemini, timeout, failover |
| `lib/import-files/` | Sì | Upload `import-sources`, lifecycle, dedup hash |
| `ordini-fornitori/import/` | Sì | Pattern analisi PDF + righe tabellari |
| `entity-resolution/fuzzy-scorers` | Sì | Tier 3 descrizione |
| `lookup-fornitore.server.ts` | Sì | Match fornitore P.IVA/nome |
| Document capture v4.1 wizard | No | Scoped schede officina → interventi |
| Hybrid OCR Tesseract | No | Solo template CAB blank |

---

## 3. Punti di integrazione

- **Nuove tabelle**: `inventory_documents`, `inventory_document_lines`, `inventory_item_matches`
- **Estensione**: `movimenti_ricambi.inventory_document_id`, `inventory_document_line_id`
- **RPC**: `inventory_receiving_apply` — apply atomico stock
- **Permesso**: page `magazzino_carichi`, module `magazzino_carichi`
- **UI**: `/magazzino/carichi`, `/magazzino/carichi/nuovo` — link da `magazzino-view`
- **API**: `/api/magazzino/receiving/*`
- **Import kind**: `ddt_receiving` in `import_files`

---

## 4. Problemi e rischi

| # | Problema | Mitigazione v1 |
|---|----------|----------------|
| 1 | `movimentiService` client-only | RPC server `inventory_receiving_apply` |
| 2 | Nessun FK documento su movimenti | Colonne nullable su `movimenti_ricambi` |
| 3 | Fornitori in settings localStorage | Snapshot `supplier_label` + lookup P.IVA |
| 4 | Idempotenza apply | `apply_status` per riga; status documento APPLIED |
| 5 | `lib/ddt/` = DDT uscita | Dominio separato `inventory-receiving` |

---

## 5. Valutazione `inventory_supplier_codes`

**Decisione v1: NON introdurre.**

Motivo: `meta.fornitoriAlternativi[]` copre il caso comune; una tabella dedicata senza dati reali rischia manutenzione manuale.

**Criteri v2** (introdurre solo se):

- Hit rate matching supplier code < 70% con solo meta scan
- Catalogo > 500 ricambi con > 3 codici alternativi ciascuno
- Latenza matching > 500ms su scan JSONB

**Catena v1:**

```
DDT codice → magazzino_ricambi.codice → meta.fornitoriAlternativi → fuzzy descrizione
```

---

## 6. Pattern transazionale

| Pattern | File | Reale comportamento |
|---------|------|---------------------|
| `commitCriticalMutation` | `audit-log.ts` | Flush audit — **non** BEGIN/COMMIT SQL |
| `document_capture_begin_apply` | migration 20260902130800 | RPC lock + stato atomico |
| `invoice_apply_transition` | migration 20260910150000 | RPC transizione + side-effect |
| `listino-import-execute` | server TS loop | No transazione DB |

**Raccomandazione:** RPC `inventory_receiving_apply()` in PL/pgSQL per:
- lock documento
- insert ricambi + movimenti in unica transazione
- idempotenza per riga
- status APPLIED / PARTIALLY_APPLIED

Audit log post-RPC via `writeModificaLog` nel wrapper server (pattern listino-import).

---

## 7. Componenti riusabili

| File sorgente | Ruolo nel nuovo dominio |
|---------------|-------------------------|
| `ordine-fornitore-import-analysis.ts` | Template `parseDdtWithAi` |
| `ordine-fornitore-import-schema.ts` | Template Zod extraction |
| `check-import-duplicate.server.ts` | Dedup hash/semantic |
| `duplicates.ts` | Match codice esatto |
| `fuzzy-scorers.ts` | Match descrizione |
| `capture-apply-rpc.server.ts` | Template RPC wrapper |
| `use-import-file-upload.ts` | Upload wizard step 1 |
| `ricambio-form-fields.tsx` | Form nuovo ricambio in review |

---

## 8. Piano implementativo

Vedi piano v2 approvato. Fasi:

1. Migration + RPC
2. RBAC `magazzino_carichi`
3. `lib/inventory-receiving/` (extraction, matching, apply)
4. API routes
5. UI wizard split-view
6. Test + docs

### Campi chiave v1

- `extracted_quantity` / `received_quantity` su righe
- `document_ai_confidence` su documento
- `purchase_order_id` nullable (futuro ordini fornitori)
- Status `PARTIALLY_APPLIED`

### Fuori scope

Scaffali, ubicazioni, inventario fisico, QR posizione, wire ordini fornitori.

---

## Rischi residui

| Rischio | Severità | Mitigazione |
|---------|----------|-------------|
| Matching fuzzy impreciso | Media | Review obbligatoria + confidence globale |
| RPC complexity | Media | Test unit + pattern document-capture |
| Catalogo grande | Bassa | In-memory v1; monitorare per v2 |
