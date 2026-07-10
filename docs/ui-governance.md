# UI Governance

Governance layer per tooltip, liste, menu e overlay UI del gestionale CAB.

**Owner team:** `frontend-platform`  
**Contract version:** vedi `UI_CONTRACT_VERSION` in `lib/ui-design-system-lock/component-contracts.ts`

## Architettura

```
Design System Existing → Governance Contract → Component Contracts
  → Barrel API (@/components/ui) → ESLint AST → Audit Engine → Release Gate
```

## Regole fondamentali

1. **Nessun redesign** — il design custom esistente è SSOT.
2. **Nessuna primitive parallela** — nuovi casi fuori tassonomia richiedono ADR in `docs/adr/`.
3. **Import consumer** — solo `@/components/ui` per tooltip/menu governati (non `@/components/design-system/tooltip`).
4. **Escape hatch** — `// ui-contract-disable-next-line <rule>: <motivazione min 10 char>`; sempre visibile in audit.

## Chi approva cosa

| Cambio | Reviewer | ADR |
|--------|----------|-----|
| Token CSS (`lib/ui/`) | frontend-platform | se nuova categoria |
| Nuova primitive Stable | frontend-platform | obbligatoria |
| Bump `UI_PRIMITIVE_VERSIONS` | frontend-platform | se breaking API |
| Bump `UI_CONTRACT_VERSION` | frontend-platform | se nuove regole BLOCKER |
| Escape hatch in PR | frontend-platform | motivazione in commento |

## Vietato (enforcement BLOCKER)

- `title=""` su elementi HTML nativi per hover tooltip
- Portal tooltip inline (`createPortal` + `dsTooltipContent` fuori design-system)
- Import diretto `@/components/design-system/tooltip` fuori allowlist
- Menu portal custom (`<ul role="menu">` fuori `GlobalAnchoredMenu` / `GlobalSelect`)
- `@radix-ui/react-tooltip`

## Enforcement

```bash
npm run audit:ui              # gate CI (BLOCKER → exit 1)
npm run audit:ui -- --report  # compliance score
npm run audit:ui -- --diff    # delta vs snapshot
```

Severity: **INFO** (report) · **WARN** (baseline, non blocca) · **BLOCKER** (fail CI)

## Escalation ADR

Nuovo pattern UI non coperto da `docs/ui-primitives.md`:

1. Aprire ADR in `docs/adr/`
2. Mappare a categoria esistente o proporre estensione contract
3. Review frontend-platform
4. Implementare + gallery `design-system-preview`

## Documenti correlati

- [`ui-primitives.md`](./ui-primitives.md) — tassonomia, maturity, List Policy
- [`modal-system.md`](./modal-system.md) — modali/drawer
- [`component-contracts.ts`](../lib/ui-design-system-lock/component-contracts.ts) — contratti machine-readable
