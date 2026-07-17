# Mobile Focus Visibility — RCA Report

**Data:** 2026-07-17  
**Scope:** Focus/scroll mobile su input in modali, drawer e pagina gestionale.

---

## Sintomo

Su mobile, al focus di un input con tastiera virtuale:

1. La viewport si riduce
2. La pagina scrolla automaticamente
3. L'input finisce in alto, label tagliata o campo parzialmente coperto

---

## Root cause

### RC-1 — Doppio conteggio tastiera (primaria)

`getEffectiveVisibleBand` sottraeva `keyboardInset` da `visualViewport.bottom`, ma `vv.bottom` esclude già la tastiera.

**Effetto:** banda visibile dimezzata → scroll eccessivo verso l'alto.

**Fix:** `visibleBottom = vvBottom - safeBottom - extraBottom` quando `visualViewport` disponibile.

### RC-2 — Pipeline multi-scroll (secondaria)

Ordine concorrente:

- Browser UA scroll al focus
- `focusin` → scroll immediato
- `useMobileModalKeyboard` → re-scroll su apertura tastiera
- Secondo scroll post `waitForViewportStable`

**Effetto:** comportamento non deterministico.

**Fix V2:** Focus Transaction — un solo scroll post-stabilizer; keyboard hook solo pad.

### RC-3 — Rettangolo scroll incompleto

Con tastiera aperta, il delta usava solo label+campo senza titolo sezione/helper/errore.

**Fix:** `getFocusScrollRect` sempre; `getFocusScrollBlockRect` esteso a helper/errore.

### RC-4 — Stabilizer insufficiente

Solo 2 frame su `keyboardInset`; nessun quiet period né timeout assoluto.

**Fix:** `quietPeriod: 80ms`, `timeout: 500ms`, tuple `(inset, vvHeight, offsetTop)`.

---

## Architettura V2

| Modulo | Ruolo |
|---|---|
| `lib/ui/mobile-modal-behavior.ts` | SSOT math, `resolveScrollOwner`, CSS vars |
| `lib/ui/focus-visibility-pipeline.ts` | Focus Transaction, Native Scroll Guard |
| `lib/ui/gestionale-viewport-orchestrator.ts` | Viewport stabilizer |
| `lib/ui/focus-visibility-flags.ts` | `NEXT_PUBLIC_MOBILE_FOCUS_VISIBILITY_V2` |
| `lib/ui/focus-visibility-debug.ts` | `__CAB_FOCUS_DEBUG` + eventi |
| `src/components/ios-interaction-stability.tsx` | Bootstrap `focusin` |

---

## Timeline eventi (V2)

```
touch → focus → focusin
  → beginFocusTransaction (baseline scrollTop + block rect)
  → waitForViewportStable (80ms quiet | 500ms timeout)
  → minimal movement check (intero focus block)
  → heal UA scroll solo se incompatibile
  → al massimo un scrollBy
  → completed
```

---

## Rollout

- **V2 (default):** Focus Transaction pipeline
- **V1 rollback:** `NEXT_PUBLIC_MOBILE_FOCUS_VISIBILITY_V2=false`

---

## Verifica

- Unit: `lib/ui/mobile-modal-behavior.test.ts`, `lib/ui/focus-visibility-pipeline.test.ts`
- Regression: `lib/regression/mobile-focus-ssot-audit.test.ts`
- E2E: `e2e/smoke/mobile-focus-field-visibility.spec.ts`
