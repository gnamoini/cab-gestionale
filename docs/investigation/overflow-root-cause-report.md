# Overflow Root Cause Report

Generated: 2026-06-17T00:25:07.640Z (initial collect — unauthenticated)

Source: `test-results/overflow-root-cause-audit.json`

## Status

| Item | Result |
|------|--------|
| Audit tooling | Implemented (DEV-only) |
| Sessions collected | 72 (12 route × 6 viewport) |
| Login admin | **FAILED** — `SMOKE_ADMIN_EMAIL` / `SMOKE_ADMIN_PASSWORD` assenti in `.env.local` |
| Root culprits (authenticated) | **Non disponibili** — tutte le sessioni reindirizzate a `/login` |

### Fix applicato post-prima raccolta

La prima raccolta non trovava `window.__cabOverflowAudit` sulla pagina login perché il modulo era montato solo in `AppShell`. Ora è registrato globalmente via `app-providers.tsx` (side-effect import in development).

**Per ottenere P0/P1/P2 reali:** aggiungere credenziali smoke in `.env.local` (vedi `.env.smoke.example`), riavviare dev con flag audit, rieseguire collect.

```bash
# Terminal 1
NEXT_PUBLIC_OVERFLOW_ROOT_CAUSE_AUDIT=1 npm run dev

# Terminal 2 (.env.local con SMOKE_ADMIN_EMAIL/PASSWORD)
npm run ops:overflow-audit-collect
npm run ops:overflow-audit-report
```

---

## Summary (prima raccolta — solo /login)

- Unique root culprits: **0** (nessun `.cab-app-shell main` su login)
- P0: 0 | P1: 0 | P2: 0

---

## Limitations

- React line numbers are approximate (fiber `_debugSource` or first export match).
- Server Components may not resolve to a client component name.
- Modals excluded from scan.
- Intentional horizontal scroll scopes excluded from root culprits.
- Richiede login admin per route gestionale.

---

## P0 — Critical

_Nessun dato autenticato — rieseguire collect con `SMOKE_ADMIN_*`._

---

## P1 — Significant

_Nessun dato autenticato._

---

## P2 — Minor

_Nessun dato autenticato._

---

## Sospetti da verificare (post-login, non fix)

Da grep statico su classi `min-w-[` / tabelle dense — **da confermare con audit runtime**:

| Area | File | Indizio |
|------|------|---------|
| Report tabelle | `components/report/report-lavorazioni-section.tsx` | `min-w-[720px]` |
| Report magazzino | `components/report/report-magazzino-section.tsx` | `min-w-[720px]` |
| Preventivi editor | `components/preventivi/preventivi-editor-modal.tsx` | `min-w-[960px]` |
| Preventivi lista | `components/preventivi/preventivi-view.tsx` | colonne `min-w-[*]` dense |
| Shell clip layer | `components/gestionale/app-shell.tsx` | `.cab-app-shell { overflow-hidden }` maschera bleed |

---

## Tooling reference

| Artefatto | Path |
|-----------|------|
| Core audit | `lib/observability/overflow-root-cause-audit.ts` |
| React mapping | `lib/observability/overflow-react-source.ts` |
| DEV mount | `components/observability/overflow-root-cause-audit-mount.tsx` |
| Collect | `npm run ops:overflow-audit-collect` |
| Report | `npm run ops:overflow-audit-report` |
| Console tag | `[OVERFLOW]` |
| Export API | `window.__cabOverflowAudit()` |

### Viewport audit

390, 724, 768, 1024, 1362, 1440

### Route audit (admin)

`/dashboard`, `/lavorazioni`, `/lavorazioni-clienti`, `/preventivi`, `/documenti`, `/magazzino`, `/mezzi`, `/dipendenti`, `/bunder`, `/report`, `/impostazioni`, `/dashboard/security`

---

## Per-session raw counts (prima raccolta — audit API non su main)

| viewport | route | raw hits | root culprits | doc overflow |
|----------|-------|----------|---------------|--------------|
| 390–1440 | tutte | - | - | no (redirect /login) |
