# Tooltip Cleanup — Final Report

> 2026-07-18 — Tooltip UX Audit & Cleanup (+ pass MANUAL_REVIEW)

## Riepilogo

| Metrica | Baseline | Post-cleanup | Delta |
| ------- | -------- | ------------ | ----- |
| Totale tooltip inventariati | 262 | 234 | **−28 (−10,7%)** |
| REMOVE_DUPLICATE (auto) | 0 | 0 | — |
| MANUAL_REVIEW | 181 | 168 | **−13** |
| Score &lt; 25 (da rimuovere) | — | 15 | vedi sotto |

Baseline: [`TOOLTIP_AUDIT_BASELINE.md`](./TOOLTIP_AUDIT_BASELINE.md)  
Inventario: [`TOOLTIP_AUDIT.md`](./TOOLTIP_AUDIT.md)  
**Score MANUAL_REVIEW**: [`TOOLTIP_MANUAL_REVIEW_SCORES.md`](./TOOLTIP_MANUAL_REVIEW_SCORES.md)  
Generatori: [`TOOLTIP_PRIMITIVE_GENERATORS.md`](./TOOLTIP_PRIMITIVE_GENERATORS.md)

## Pass MANUAL_REVIEW (2026-07-18)

- Aggiunto `tooltipNecessityScore` + `inferDynamicTooltipNecessity` in `lib/ui/tooltip-value-score.ts`
- Report score 0–100 per ogni entry dinamica (`npm run audit:tooltip` → `TOOLTIP_MANUAL_REVIEW_SCORES.md`)
- Rimossi tooltip ridondanti su: testo bottone visibile, campane notifiche, segmenti UM, ordini fornitori, documenti (comprimi/espandi, upload), preventivi, schede lavorazione, calendario promemoria (dot non hoverabile)
- Pattern: `OptionalTooltip` solo per `READONLY_PERMISSION_HINT` / errori validazione; `TruncatedTextTooltip` per nomi file troncati

### Fascia score (ultimo audit)

| Score | Azione | Conteggio tipico |
| ----- | ------ | ---------------- |
| 0–24 | Rimuovere | ~15 (primitive già filtrano a runtime) |
| 25–49 | Revisione | ~11 (report KPI troncati) |
| 50–100 | Mantenere | ~140 (timesheet, agenda, sicurezza, readonly) |

## Artefatti creati

| File | Ruolo |
| ---- | ----- |
| [`lib/ui/tooltip-value-score.ts`](../lib/ui/tooltip-value-score.ts) | `TooltipVerdict`, `tooltipValueScore`, `classifyTooltipVerdict`, `resolveTooltipContent` |
| [`lib/ui/tooltip-audit-scan.ts`](../lib/ui/tooltip-audit-scan.ts) | AST inventario repo-wide |
| [`lib/lint/rules/tooltip-redundant.ts`](../lib/lint/rules/tooltip-redundant.ts) | Scan WARN duplicati statici |
| [`scripts/audit-tooltip-ux.ts`](../scripts/audit-tooltip-ux.ts) | `npm run audit:tooltip` |
| [`docs/design-system/TOOLTIP_POLICY.md`](../design-system/TOOLTIP_POLICY.md) | Policy UX SSOT |
| [`lib/regression/tooltip-consistency-audit.test.ts`](../lib/regression/tooltip-consistency-audit.test.ts) | Test governance |

## Pagine / file modificati

### Primitive condivisi (Fase 4–5a)

- [`components/design-system/icon-action-button.tsx`](../components/design-system/icon-action-button.tsx) — `resolveTooltipContent`
- [`components/design-system/icon-button.tsx`](../components/design-system/icon-button.tsx) — `OptionalTooltip` + score
- [`components/gestionale/page-header-toolbar.tsx`](../components/gestionale/page-header-toolbar.tsx) — refresh mobile-only tooltip, log `logTitle`, undo senza tooltip ridondante

### Cleanup pagine (Fase 5b–5c)

- [`components/gestionale/media/record-image-manager.tsx`](../components/gestionale/media/record-image-manager.tsx) — rimossi tooltip su icon-only con `aria-label`
- [`components/gestionale/magazzino/ricambio-info-panel.tsx`](../components/gestionale/magazzino/ricambio-info-panel.tsx) — `OptionalTooltip` da barrel `@/components/ui`
- [`components/lavorazioni/schede/schede-lavorazione-modal.tsx`](../components/lavorazioni/schede/schede-lavorazione-modal.tsx) — rimossi 3× `Tooltip "Rimuovi"` su pulsanti icon-only

### Governance

- [`lib/ui/ui-consistency-audit.ts`](../lib/ui/ui-consistency-audit.ts) — categoria `TooltipRedundant` (WARN)
- [`lib/regression/smoke-regression-lists.ts`](../lib/regression/smoke-regression-lists.ts) — test aggiunto
- [`docs/ui-primitives.md`](../ui-primitives.md) — link policy UX
- [`package.json`](../package.json) — script `audit:tooltip`

## Eccezioni motivate

- **Icon-only + tooltip = aria-label** (`CloseButton`, `ShellNavBackButton`): `KEEP_ACCESSIBILITY` per policy — non rimossi.
- **`GestionaleDirtySaveActions`**: `cancelTitle` / `saveTitle` ampliano CTA visibili → `KEEP_CONTEXTUAL`.
- **`TruncatedTextTooltip`**, **`DisabledElementTooltip`**, **`TooltipStatus`**: esclusi dallo scan WARN.

## UX Validation

- [x] Nessun tooltip duplicato su CTA testuali desktop (refresh toolbar: tooltip solo mobile)
- [x] Icon-only actions hanno `aria-label`
- [x] Stati colore hanno spiegazione (`TooltipStatus` invariato)
- [x] Troncamenti testo mantengono tooltip (`TruncatedTextTooltip` invariato)
- [x] Disabled actions spiegano il motivo (`DisabledElementTooltip` invariato)
- [x] Mobile actions verificati (`GestionaleRefreshToolbarButton` breakpoint-aware)
- [x] KEEP_CONTEXTUAL preservati (dirty-save, documenti tree, agenda)

## Verifica eseguita

```bash
npm run audit:tooltip
npx tsx lib/ui/tooltip-value-score.test.ts          # OK
npx tsx lib/regression/tooltip-consistency-audit.test.ts  # OK
npx tsx lib/regression/tooltip-contract-api.test.ts       # (non rieseguito — invariato)
npx tsx lib/regression/tooltip-keyboard-a11y.test.ts      # (non rieseguito — invariato)
```

`npm run ci:tsc` — errori pre-esistenti fuori scope; fix applicato a `tooltip-redundant.ts`.

## Rischi residui

- 181 entry `MANUAL_REVIEW` richiedono review incrementale quando il contenuto è reso statico o i caller migrano a `resolveTooltipContent`.
- Promuovere `TooltipRedundant` da WARN a BLOCKER solo dopo ondata aggiuntiva su aree report/dashboard.
