---
name: Portal dirty sync semantics
overview: "Allineare il Portale al modello gestionale: apertura con dati freschi, modifiche remote → dirty + banner (no auto-list), refresh atomico (refetch completato → clear dirty). Revert live invalidate su portale; no clearGestionaleDirty al mount."
todos:
  - id: reproduce-two-browser
    content: "Due browser: verificare no auto-list, banner entro pochi sec, Aggiorna atomico, no banner all'apertura post-sync"
    status: pending
  - id: revert-always-live-portale
    content: Rimuovere portale da ALWAYS_LIVE_SYNC_DOMAINS; aggiungere portale a PILOT_HEAVY_DOMAINS
    status: pending
  - id: audit-versioning
    content: "Audit operational-data-version, acknowledgeOperationalTableVersions, dirtyEntry.remoteVersion — banner vs versione DB"
    status: pending
  - id: atomic-portal-sync
    content: "Helper sync atomico: invalidate → refetch await → acknowledge version → clear dirty (no clear prima del refetch)"
    status: pending
  - id: portal-open-sync-success
    content: "Clear dirty portale solo dopo fetch iniziale riuscita (L0 success), non al mount"
    status: pending
  - id: portal-refresh-toolbar
    content: "Toolbar Aggiorna e banner usano lo stesso helper sync atomico"
    status: pending
  - id: banner-dedup-single
    content: "Test: 5 modifiche senza refresh → un solo banner; dopo Aggiorna banner off; nuova modifica → banner ricompare"
    status: pending
  - id: banner-copy-portale
    content: "Opzionale: copy DataStaleBanner per domain portale"
    status: pending
  - id: dispatch-dirty-debug
    content: Log dev dirty_mark + version in gestionale-sync-dispatch per tabelle portale
    status: pending
  - id: update-sync-policy-tests
    content: "client-portal-sync-policy.test.ts: dirty not invalidate con scope portale"
    status: pending
  - id: banner-routing-tests
    content: getVisibleDirtyEntries portale route + E2E banner lifecycle
    status: pending
isProject: false
---

# Fix sincronizzazione Portale — semantica dirty sync + banner

Vedi piano completo: `portal_dirty_sync_semantics_ac9c6a9b.plan.md` in Cursor plans.

## Modifiche chiave rispetto alla versione precedente del piano

1. **No `clearGestionaleDirty` al mount** — clear solo dopo fetch/sync iniziale **riuscita** (L0 ready + ack version).
2. **Refresh atomico** — invalidate → refetch await → ack → clear dirty (non `flushGestionaleDirty` che clear prima del refetch).
3. **Banner dedup** — test scenario v1 + 5 modifiche → un banner; audit `dirtyEntryKey` + versionamento operativo.
4. **Acceptance** estesa — no auto-list, banner timing, no banner se già allineato, convergenza dataset post-refresh.
