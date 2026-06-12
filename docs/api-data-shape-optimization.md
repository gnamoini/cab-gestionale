# API Data Shape Optimization

Refactor Light/Detail DTO per ridurre payload PostgREST e roundtrip su schermate core, senza modifiche SQL/RLS.

## API Shape Issues Found

1. **Embed mezzo + profili** su lista lavorazioni: ~+75% bytes vs colonne sole (benchmark `lavorazioni_D_full` vs `lavorazioni_A_columns_only`).
2. **Dual fetch attive/chiuse** sempre in parallelo (~98 ms warm) anche con archivio collassato.
3. **Report bundle** ~51 KB: lavorazioni con embed mezzo duplicato rispetto a fetch mezzi full.
4. **Mezzi list** includeva `meta` non usato in tabella lista.

## Refactor Applied

| Wave | Scope | File principali |
|------|-------|-----------------|
| W1 | SSOT LIGHT/DETAIL + mappers + test | `table-select-columns.ts`, `dto-mappers.ts`, `performance-policy.test.ts`, `dto-mappers.test.ts` |
| W2 | Lavorazioni light default, defer chiuse, profili lazy mobile | `lavorazioni-list-fetch.ts`, `lavorazioni-view.tsx`, `lavorazioni-profile-names-fetch.ts`, `lavorazioni-domain.queries.ts` |
| W3 | Mezzi list light | `mezzi.service.ts`, `use-entity-list-queries.ts` |
| W4 | Report mezzi-only join | `use-report-live-data.ts`, `dto-mappers.ts` (`enrichLavorazioneListRowsWithMezzi`), `magazzino.service.ts` |
| W5 | Dashboard alignment | `use-dashboard-metrics.ts`, `use-entity-list-queries.ts` (`useGestionaleQueryOpts` su mezzi) |
| W6 | Benchmark + docs | `rest-benchmark-roles.mjs`, questo file, `api-shape-field-matrix.md` |

### Comportamento chiave

- **Lista lavorazioni**: `fetchMode: 'light'` (default), `includeProfiles: false`; embed mezzo slim (7 campi).
- **Archivio**: fetch chiuse `enabled` solo se sezione espansa, ricerca o filtri avanzati attivi.
- **Mobile «ultima modifica»**: batch `profiles(id,nome)` lazy per UUID visibili.
- **Report**: lavorazioni senza embed mezzo; join in adapter via `mezziById`.
- **Portale clienti**: `fetchMode: 'detail'` + `includeProfiles: true` esplicito.

## Performance Impact

Rieseguire benchmark:

```bash
node scripts/ops/rest-benchmark-roles.mjs > test-results/rest-benchmark-roles.json
```

Varianti nuove nello script:

- `lavorazioni_E_light_attive` — lista light + embed slim
- `lavorazioni_F_report_light` — report senza embed
- `mezzi_list_light`, `report_*` slim vs `report_*_legacy`

Target indicativi (dataset ~37 righe, vedi audit):

| Endpoint | Prima | Target post-refactor |
|----------|-------|----------------------|
| Lavorazioni LIGHT attive (~14 righe) | ~11.4 KB | −30–45% |
| Schermata lavorazioni cold | 2 query ~98 ms | 1 query ~50–60 ms + chiuse lazy |
| Report bundle | ~51 KB | −35–50% |
| Mezzi list | ~16.1 KB | −15–25% |

Aggiornare la tabella con i valori misurati da `test-results/rest-benchmark-roles.json` dopo ogni deploy.

## Remaining Structural Bottlenecks

- RTT rete e jitter PostgREST (DB execution già sub-ms).
- Full-table client-side a scala crescente (nessuna paginazione server in questo refactor).
- RPC aggregazioni report non introdotte (fuori scope).
- RLS authenticated overhead su EXPLAIN (mitigato lato payload, non SQL).
