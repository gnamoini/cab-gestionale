# Tooltip Policy — UX SSOT

Policy UX per i tooltip del gestionale CAB. Complementa la governance tecnica in [`docs/ui-governance.md`](../ui-governance.md) e [`docs/ui-primitives.md`](../ui-primitives.md).

## Principio guida

Un tooltip **aggiunge informazione**. Non ripete testo già visibile, label di bottone, titoli di sezione o azioni ovvie.

## Tassonomia `TooltipVerdict`

| Verdict | Significato | Esempio |
| ------- | ----------- | ------- |
| `REMOVE_DUPLICATE` | Zero valore aggiunto | Bottone «Salva» + tooltip «Salva» |
| `KEEP_INFORMATIONAL` | Dettaglio non deducibile | Badge «AI» → «Analisi con Gemini 2.5 Pro» |
| `KEEP_ACCESSIBILITY` | Icon-only: tooltip coerente con `aria-label` | Icona chiudi + `aria-label="Chiudi"` |
| `KEEP_CONTEXTUAL` | Testo simile ma contesto ampliato | «Importa» → flusso DDT completo |
| `MANUAL_REVIEW` | Contenuto dinamico / incerto | `content={variable}` non risolvibile |

Implementazione: [`lib/ui/tooltip-value-score.ts`](../../lib/ui/tooltip-value-score.ts).

## `tooltipValueScore`

```text
score === 0  → candidato REMOVE_DUPLICATE (se c’è testo visibile)
score > 0    → KEEP_CONTEXTUAL o KEEP_INFORMATIONAL
icon-only    → score base = lunghezza tooltip (aria-label resta per SR)
```

## Tooltip vs aria-label

| Meccanismo | Ruolo |
| ---------- | ----- |
| `aria-label` | Screen reader — **resta** su controlli icon-only |
| Tooltip hover | Scoperta mouse — **rimuovere** se duplica testo visibile |

Rimuovere un tooltip duplicato **non** implica rimuovere `aria-label`.

## Regola mobile

`REMOVE_DUPLICATE` solo se:

1. Il trigger ha testo **sempre visibile** a tutti i breakpoint, **oppure**
2. `aria-label` sufficiente su icon-only, **oppure**
3. Breakpoint gestito esplicitamente (es. tooltip solo sotto `sm`)

```text
Desktop: [ Salva ]        → tooltip «Salva» = REMOVE_DUPLICATE
Mobile:  [ 💾 ] sr-only   → tooltip «Salva» = KEEP_ACCESSIBILITY
```

Pattern: `useSmUp()` + `OptionalTooltip` con content solo su mobile.

## Primitive per caso d’uso

| Caso | Primitive |
| ---- | --------- |
| Icona senza testo | `IconActionButton`, `Tooltip` + `aria-label` |
| Testo troncato | `TruncatedTextTooltip` |
| Controllo disabilitato | `DisabledElementTooltip` + motivo |
| Badge/stato colore | `TooltipStatus` |
| Tooltip opzionale | `OptionalTooltip` + `resolveTooltipContent()` |

## Escape hatch

```tsx
// ui-contract-disable-next-line tooltip-redundant: motivazione min 10 caratteri
```

## Audit e governance

```bash
npm run audit:tooltip              # inventario
npm run audit:tooltip -- --baseline  # snapshot baseline
```

Report: [`docs/audit/TOOLTIP_AUDIT.md`](../audit/TOOLTIP_AUDIT.md)

## Documenti correlati

- [`docs/ui-primitives.md`](../ui-primitives.md)
- [`docs/ui-governance.md`](../ui-governance.md)
- [`docs/modal-system.md`](../modal-system.md)
