# PDF HTTP cache audit (browser)

Gate per `ETag` + `304 Not Modified` su `GET /api/pdf/artifacts/:type`.

## URL construction

- Client: `buildPdfArtifactUrl` — query `id`, `lavorazioneId`, `month`, `employeeId`, `autore`.
- **Hash non in URL** — invalidazione via `ETag: "<dataHash>"` dove `dataHash` deriva da metadata record.

## Auth

- Route protetta da session cookie Supabase (same-origin).
- RBAC: `verifyPdfArtifactReadAccess` prima di qualsiasi byte.
- `Cache-Control: private` — nessuna condivisione CDN cross-user.

## Invalidazione

- Mutazione dati → nuovo `dataHash` → nuovo `ETag` → browser MISS.
- `If-None-Match` match → `304` senza body (risparmio banda; server esegue ancora metadata+storage per verifica hash).

## Decisione

| Header | Valore | Motivo |
|--------|--------|--------|
| `ETag` | `"<dataHash>"` | Coerente con storage path |
| `Cache-Control` | `private, max-age=300` | 5 min — compromesso audit; non `immutable` (URL senza hash) |
| `304` | Su `If-None-Match` | Abilitato in route artifact |

## Rischi residui

- Logout non invalida cache browser entro `max-age` — accettabile: PDF già scaricato in tab; nuove richieste post-logout falliscono RBAC.
- Cambio ruolo RBAC mid-session — prossima richiesta artifact 403; cache browser non espone dati ad altri utenti (private).
