# Discovery 2 — final report

## Connection
PASS

## Read-only guarantee
PASS — WRITE TESTS EXECUTED = 0

## Preventivo
- module/file = Produzione/preventivi (UNRESOLVED — HTTP 500)
- confidence = low
- status = BLOCKED

## Consuntivo
- representation = Produzione/task (partial)
- billing path = NOT VERIFIED
- confidence = low
- status = BLOCKED

## DDT
- module/file = Magazzino/movimento
- customer reference = anagrafica_id / clifor_id
- rows = NOT_VERIFIED
- sectional = sezionale + Amministrazione/sezionali
- number = doc_number / doc_number_padded
- confidence = medium (module) / low (numbering)
- status = PASS_CONDITIONED

## Customer
- module/file = Base/clienti (inferred, not readable)
- PK = NOT_VERIFIED
- VAT = NOT_VERIFIED
- tax code = NOT_VERIFIED
- customer reference = anagrafica_id
- confidence = low
- status = BLOCKED

## Items
- module/file = Magazzino/articoli
- PK = id_articoli
- document FK = NOT_VERIFIED (likely id_articoli)
- status = PASS_CONDITIONED

## Services / Manodopera
- representation = articoli.tipo S + risorse_umane tab
- status = PASS_CONDITIONED

## IVA
- module/file = Base/iva
- document FK = cod_iva_vendita_id (articoli) — NOT_VERIFIED on rows
- status = PASS_CONDITIONED

## UoM
- module/file = Base/unita_misura
- document FK = unita_misura_id
- status = PASS_CONDITIONED

## Correlation
- field = none acceptable
- writeable = NOT_VERIFIED
- readable = NOT_VERIFIED
- searchable = NOT_VERIFIED
- persistent = NOT_VERIFIED
- status = BLOCKED

## Numbering DDT
- year = NOT_VERIFIED
- sectional = sezionale menu
- number = doc_number
- assignment = REQUIRES_SAFE_WRITE_TEST
- status = PARTIALLY_VERIFIED

## HTTP 500 diagnosis

- `Base/clienti`: info=500 index=404 → UNKNOWN_500 (medium)
- `Produzione/preventivi`: info=500 index=404 → UNKNOWN_500 (medium)
- `Produzione/preventivo`: info=500 index=404 → UNKNOWN_500 (medium)
- `Magazzino/ddt`: info=500 index=404 → UNKNOWN_500 (medium)
- `Produzione/consuntivi`: info=500 index=404 → UNKNOWN_500 (medium)
- `Produzione/attivita`: info=500 index=404 → UNKNOWN_500 (medium)

## Self-solvable vs vendor

### SELF_SOLVABLE_READ_ONLY
- Catena causale→sezionale→movimento (OBSERVED)
- Livesearch target inference (partial)
- DDT module = movimento (confirmed)

### SELF_SOLVABLE_WITH_SAFE_WRITE_TEST
- DDT numbering assignment
- Document row structure (materiali tab)
- Correlation via note_integrazioni (if vendor confirms)

### REQUIRES_VENDOR_SUPPORT
- Base/clienti READ
- Produzione/preventivi READ
- Correlation key field on movimento/preventivo
- Consuntivo billing path
- Produzione/attivita READ

### UNKNOWN
- Exact meaning of HTTP 500 without explicit error body on clienti/preventivi/ddt

## Safety checklist
- [x] No CREATE/UPDATE/DELETE
- [x] WRITE TESTS EXECUTED = 0
