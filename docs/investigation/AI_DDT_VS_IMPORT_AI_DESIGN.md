# Confronto design — Import AI Lavorazioni vs AI DDT Magazzino

**Data:** 2026-07-18

---

## Regole framework (vincolanti)

1. **Un solo upload SSOT:** `lib/import-files/` — vietato uploader parallelo in domini consumer.
2. **Consumer pattern:** `import-files → document processing → business domain`.
3. **AI runtime SSOT:** `lib/ai/runtime/service.ts` — `generateObject` con Zod, no JSON libero.
4. **No fork document-capture** per DDT: tabelle/API capture restano per schede officina.

```
import-files
    ├── inventory-receiving → stock (DDT inbound)
    ├── document-capture → lavorazioni (schede)
    └── ordini-fornitore/import → ordini
```

---

## Tabella gap

| Area | Import AI Lavorazioni | AI DDT | Gap | Priorità |
|------|----------------------|--------|-----|----------|
| Upload SSOT | import-files / capture bucket | import-files `ddt_receiving` | Recovery session pending | P1 |
| Progress | Fasi etichettate + retry | Acquisition progress base | Checklist OCR/estrazione | P1 |
| AI runtime | `analyzeDocument` | `generateObject` (corretto) | Bug `result.object`, retry | P0 |
| Error handling | Quota, countdown, toast | Inline + 409 | Allineare retry pattern | P1 |
| Review UX | Field grid + entity match | Tabella qty | Confidence gate + actions | P1 |
| Apply | `begin_apply` lock RPC | RPC `FOR UPDATE` | Shared apply-lock RFC | P0/P2 |
| Audit | Multi-entity logs | 1 header apply | `AI_ANALYSIS_COMPLETED` | P2 |
| Resume | sessionStorage draft | `?documentId=` + pending API | Banner sospeso | P1 |
| Duplicate | `CaptureDuplicateDialog` | Confirm base | Link doc esistente | P1 |
| Stati UI | Step indicator capture | Step indicator receiving | UI status mapper (no DB migration) | P0 |
| List UX | GestionaleListTable | HTML table | List polish | P2 |

---

## Cosa riusare da Lavorazioni (senza fork)

| Pattern | File riferimento | Uso DDT |
|---------|------------------|---------|
| Modal shell | `GestionaleModalShell` formLarge | `magazzino-carichi-capture-launcher` |
| Step indicator | `DocumentCaptureStepIndicator` | `InventoryReceivingStepIndicator` |
| Acquisition progress | `DocumentCaptureAcquisitionProgress` | Stesso + checklist labels |
| Upload drop | `GestionaleUploadDropExpand` | Hub step |
| AI CTA | `GestionaleAiActionButton` | Toolbar magazzino |
| Duplicate confirm | `GestionaleConfirmDialog` + link | DDT duplicate |

## Cosa NON riusare

- `CaptureSchedaCompileStep`, field mapper scheda
- `document_capture` table/API
- `discardEphemeralCaptureClient` (dominio capture)

---

## Lifecycle stati

**Decisione v2:** DB enum invariato (`ANALYZING`, `REVIEW_REQUIRED`, …). UI usa `inventoryReceivingStatusToUiStatus()` per label `PROCESSING`, `REVIEW`, ecc.

Motivo: compatibilità dati storici, report, altri domini import con lifecycle diversi.
