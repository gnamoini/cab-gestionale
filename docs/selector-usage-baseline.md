# Selector usage baseline (v2 plan Step 0)

Generato da `runSelectorUsageScan()` — classificazione per migration guardrail.

## Riepilogo

| Criticità | Count attivo | Note |
|-----------|--------------|------|
| critical | 1 | Scheda ingresso ident autocomplete (legacy, adapter phase 1) |
| medium | 3 | Legacy autocomplete imports via adapter |
| low | 0 | — |

## Legacy autocomplete (strangler phase 1)

| Componente | Dominio | Import via adapter |
|--------------|---------|-------------------|
| SchedaIngressoIdentAutocompleteField | schede | scheda-ingresso-anagrafica-fields |
| RicambiMagSearchPortal | magazzino | schede-lavorazione-modal |
| GestionaleMezzoAutocomplete | mezzi | (no consumer attivo in produzione) |

## Addetti — refactor completato

- `lavorazioni-view.tsx` → `AddettoSelectField` (searchable, domain addetti)
- `scheda-ingresso-form-modal.tsx` → `AddettoSelectField`
- `lavorazioni-modals.tsx` → `AddettoSelectField`

## Filtri operativi — selectOnly rimosso

- Lavorazioni filter addetto → searchable + `selectorDomain="lavorazioni"`
- Timesheet dipendente → searchable + `selectorDomain="dipendenti"`
- Security cliente → searchable + `selectorDomain="security"` (GRADUAL gate env)
- Security audit utenti → searchable + `selectorDomain="security"`

## Regole migration guardrail

- Max **5** componenti per PR selector
- No mix domini nello stesso PR
- Eseguire `npx tsx lib/regression/selector-usage-scan.test.ts` prima di merge

## DB scan (manuale)

Conteggi volatile lists da verificare in produzione: addetti settings, clienti, mezzi, users audit log.
