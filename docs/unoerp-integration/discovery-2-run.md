# Discovery 2 run

- **Timestamp:** 2026-09-03T20:37:34.178Z
- **Endpoint:** https://casbari.unoerp.it/intranet/api.php
- **Account:** CO***
- **UID:** 613
- **Encoding:** application/x-www-form-urlencoded (JSON auth body → 401 su questa istanza)
- **READ_ONLY:** PASS
- **WRITE TESTS EXECUTED:** 0

## Audit script esistente

- `transport.ts`: form-urlencoded, timeout da env, body JSON su errore acquisito
- `discovery-readonly.ts`: allowlist info/index/show
- HTTP 500: body snippet acquisito e classificato (non assumere permesso senza evidenza)

## Stabilità schema (doppio info)

- `Produzione/ordini`: STABLE (a45cfa5db35f3f5a/a45cfa5db35f3f5a)
- `Produzione/task`: STABLE (c62ba95467f631ad/c62ba95467f631ad)
- `Magazzino/movimento`: STABLE (c736c8c985280ea9/c736c8c985280ea9)
- `Magazzino/articoli`: STABLE (e61cda34ab2f4b4d/e61cda34ab2f4b4d)
- `Magazzino/causali_magazzino`: STABLE (fa8986830d396444/fa8986830d396444)
- `Amministrazione/sezionali`: STABLE (5f4e3da3eb3e6826/5f4e3da3eb3e6826)