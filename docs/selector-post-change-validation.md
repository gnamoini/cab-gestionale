# Selector post-change validation (obbligatorio ogni PR)

Checklist `post_change_validation` — v2 plan UX selector.

## Required after every selector PR

### tab_navigation
- Tab / Shift+Tab cycle opzioni listbox
- Nessun focus trap leak verso overlay chiuso

### keyboard_focus
- Apertura → focus su campo ricerca (sheet) o trigger (dropdown)
- Chiusura → `useDropdownFocusRestore` ripristina trigger

### mobile_sheet
- Body scroll locked (`useGestionaleOverlayBehavior` / scroll lock)
- Lista scroll indipendente
- Tastiera non copre risultati (`useMobileModalKeyboard` padding)

### overlay_back
- Android back + Escape chiudono senza doppio commit
- Test: `selector-concurrency-race.test.ts`, `selector-selection-atomicity.test.ts`

### atomic_selection
- Singolo `onChange` su race pointerdown + blur

### performance
- `open_latency`: < 300ms (manual o `performance.mark` in dev)
- `search_update`: percepito < 100ms (`useDeferredValue` in GlobalSelect)

### regression_tests
```bash
npx tsx lib/regression/searchable-sheet-selector-audit.test.ts
npx tsx lib/regression/selector-domain-policy-audit.test.ts
npx tsx lib/regression/selector-selection-atomicity.test.ts
npx tsx lib/regression/selector-concurrency-race.test.ts
npx tsx lib/regression/selector-usage-scan.test.ts
npx tsx lib/regression/selector-post-change-validation.test.ts
```

## block_merge_if

- Qualsiasi step sopra fallisce
- Più di 5 componenti selector migrati nello stesso PR (`SELECTOR_MIGRATION_MAX_COMPONENTS_PER_PR`)
- Mix domini nello stesso PR (es. lavorazioni + security)
