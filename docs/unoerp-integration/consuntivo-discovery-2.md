# Consuntivo discovery 2

## Representation

- Modulo `consuntivi` → HTTP 500 (NOT READABLE)
- `Produzione/task` leggibile con tab: categoria_tab, stato_tab, visibilita_tab, attivita_tab, budget_tab

**Classificazione:** B (native Task/activity structure) — **PARTIALLY_VERIFIED**

## Billing path

- `billing_path_verified` = **NO**
- `billing_path_evidence` = tab `attivita_tab`/`budget_tab` presenti ma `Produzione/attivita` HTTP 500; nessun collegamento a fatturazione verificato

## Esito

REPRESENTATION: PASS_CONDITIONED (task only) / BILLING: FAIL

**Blocker consuntivo:** REQUIRES_VENDOR_SUPPORT