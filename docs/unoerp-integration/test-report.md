# Test report UnoERP

## DISCOVERY RUN 2 (2026-09-03)

Vedi `discovery-2-final-report.md`. Pattern HTTP 500 problematici: **info=500, index=404, body vuoto** (UNKNOWN_500).

**WRITE TESTS EXECUTED = 0**

## DISCOVERY RUN (2026-09-03, casbari.unoerp.it)

| Area | Esito |
|------|-------|
| authentication | PASS |
| read-only guarantee | PASS |
| customers | FAIL (Base/clienti HTTP 500) |
| preventivi | FAIL (Produzione/preventivi HTTP 500) |
| consuntivi | FAIL |
| DDT | PASS_CONDITIONED (Magazzino/movimento) |
| items | PASS (schema) |
| services | PASS_CONDITIONED (articoli.tipo) |
| IVA | PASS |
| UoM | PASS |
| sectionals | PASS |
| correlation key | FAIL (BLOCKED) |
| permissions | PASS_CONDITIONED |

**WRITE TESTS EXECUTED = 0**

Dettaglio: `discovery-run.md`, `gate-a.md`, `capability-matrix.md`.

## Verificato in CAB (senza write UnoERP)

- Audit schema preventivi/consuntivi/DDT/clienti
- Client API senza delete; hard-block act distruttivi
- Preflight BLOCKED se registry UNRESOLVED
- Allowlist: campo extra → PAYLOAD_FIELD_NOT_ALLOWED
- Customer resolver: 0 match, ambiguo, identity drift
- Stale job: version < last_synced → STALE_JOB
- Correlation key namespaced
- Grep: nessun deleteRecord / act=delete nel modulo
- Monetary: arrotondamento a centesimi interi

## Moduli UnoERP identificati

Vedi `discovery-run.md`. DDT: `Magazzino/movimento`. Preventivo nativo non leggibile.

## Mapping finale / numerazione DDT / matching

DDT schema parziale; numerazione REQUIRES_SAFE_WRITE_TEST. Customer/preventivo READ bloccati.

## Idempotenza / anti-duplicato / anti-delete / anti-update storico

Implementati nel layer; non collaudati su API live.

## Requisiti originali

| # | Requisito | Classificazione |
|---|---|---|
| 1-2 | Create preventivo/consuntivo CAB | IMPLEMENTATO (già CAB) |
| 3 | Sync preventivo UnoERP | IMPLEMENTATO CON LIMITAZIONE (blocked pending discovery) |
| 4 | Sync consuntivo modulo corretto | NON SUPPORTATO / RICHIEDE VERIFICA UNOERP |
| 5-8 | DDT CAB + nativo + stesso numero | RICHIEDE VERIFICA UNOERP |
| 9-11 | Update, no duplicati, no drift | IMPLEMENTATO (layer; non testato live) |
| 12 | No delete | IMPLEMENTATO E VERIFICATO (codice) |
| 13 | Storico intoccabile | IMPLEMENTATO (ownership; non testato live) |
| 14-16 | Customer match / no auto-create / dati fiscali UnoERP | IMPLEMENTATO (resolver) / RICHIEDE VERIFICA campi |
| 17-20 | No accettazione, no fattura, no bidirezionale, no sync documenti non CAB | IMPLEMENTATO (contratto + codice) |

Non dichiarato "completato" alcun requisito di write UnoERP non testato sull'istanza.
