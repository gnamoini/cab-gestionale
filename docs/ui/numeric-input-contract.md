# Numeric Input UX Contract

Contratto SSOT per campi numerici nel gestionale operativo (lavorazioni, ricambi, preventivi, magazzino).

Riferimenti implementativi:

- [`lib/core/numeric-input-policy.ts`](../../lib/core/numeric-input-policy.ts) — preset per dominio
- [`lib/core/numeric-input-commit.ts`](../../lib/core/numeric-input-commit.ts) — commit on blur
- [`lib/ui/use-gestionale-numeric-draft.ts`](../../lib/ui/use-gestionale-numeric-draft.ts) — draft locale durante editing
- [`components/gestionale/gestionale-number-input.tsx`](../../components/gestionale/gestionale-number-input.tsx) — input string-controlled (anagrafica, prezzi form)
- [`components/gestionale/gestionale-numeric-field.tsx`](../../components/gestionale/gestionale-numeric-field.tsx) — input number-controlled (tabelle)
- [`components/gestionale/gestionale-quantity-field.tsx`](../../components/gestionale/gestionale-quantity-field.tsx) — quantità UM-aware

Audit: [`lib/regression/numeric-input-anti-patterns.test.ts`](../../lib/regression/numeric-input-anti-patterns.test.ts)

---

## Principio

```
Draft string durante typing → commit numerico su blur / Enter / Tab
```

Durante l'editing il **draft locale** è SSOT temporaneo. Il parent **non** riceve update fino al commit.

---

## Allowed

- `type="text"` per tutti gli input numerici gestionali
- Draft string locale (`useGestionaleNumericDraft`)
- `inputMode="decimal"` o `inputMode="numeric"`
- `isDecimalInputDraft` per validazione durante typing
- Commit su blur / Enter / Tab via `commitNumericDraft`
- Focus senza `select()` (cursore al click come campi testo; `select()` solo se esplicito sul campo)
- `onMouseDown` su `GestionaleNumberInput` per posizionare il cursore al click
- `data-gestionale-numeric` — `focusNextGestionaleField` non fa select-all su questi input
- Preset per dominio (`NUMERIC_PRESETS`, `resolveQuantityPreset`)
- Wrapper sottili: `GestionaleNumberInput`, `GestionaleNumericField`, `GestionaleQuantityField`

---

## Forbidden

- `type="number"` su input gestionale (eccezione documentata: `type="range"` per slider carburante)
- `Number(value)` o `parseFloat(value) || fallback` in `onChange` / `onInput` su campi economici
- `Math.max` / `Math.min` / `Math.round` durante typing (solo al commit)
- Parent state update ad ogni keystroke su campi con side effect (totali, KPI, derivati)
- Nuovi input numerici ad-hoc senza policy/hook condivisi

---

## Policy assi

| Asse | Valori | Uso |
|------|--------|-----|
| `emptyOnBlur` | `revert`, `default`, `zero`, `allowEmpty` | Draft `""` al blur |
| `invalidDraftOnBlur` | `revert`, `zero` | Draft non parsabile (`abc`) al blur |

Esempio ore: `""` → `0`; `"0."` → `0`; `"abc"` → revert al valore precedente.

---

## Quantità e unità di misura

La precisione quantità segue l'UM (`resolveQuantityPreset`):

| UM | Precision | inputMode |
|----|-----------|-----------|
| `pz` | 0 | `numeric` |
| `metri` | 2 | `decimal` |
| `lt` | 3 | `decimal` |

---

## Etichette magazzino — qty min

- **Scheda ricambio** (`ricambio-label-actions`): min effettivo **1** (stampa etichette)
- **Bulk lista** (`magazzino-view`): **0** = riga non selezionata

Comportamento intenzionale, non unificare.
